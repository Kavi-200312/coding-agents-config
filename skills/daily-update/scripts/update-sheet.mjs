#!/usr/bin/env node
// Daily update → SharePoint Excel writer.
// Auth: device-code flow, token cached in ~/.config/devin/daily-update/token.json.
// Usage:
//   node update-sheet.mjs --check                     # auth + list tabs + today's rows
//   node update-sheet.mjs --write "<task text>"       # write Task Description for today
//   node update-sheet.mjs --write "<text>" --module "X" --scope "Backend" --status "in-progress"

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url)); // config + token live beside the script
const config = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
const TOKEN_FILE = path.join(DIR, 'token.json');
const GRAPH = 'https://graph.microsoft.com/v1.0';

// ─── Auth ────────────────────────────────────────────────────────────────────

const form = (obj) => new URLSearchParams(obj).toString();

async function deviceCodeAuth() {
  const res = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/devicecode`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ client_id: config.clientId, scope: config.scopes }),
    }
  );
  const dc = await res.json();
  if (!res.ok) throw new Error(`devicecode failed: ${JSON.stringify(dc)}`);
  console.error(`\n>>> ${dc.message}\n`);
  const deadline = Date.now() + dc.expires_in * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, dc.interval * 1000));
    const tok = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({
          client_id: config.clientId,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: dc.device_code,
        }),
      }
    );
    const data = await tok.json();
    if (tok.ok) return data;
    if (data.error !== 'authorization_pending') throw new Error(`token failed: ${JSON.stringify(data)}`);
  }
  throw new Error('device code expired');
}

async function refresh(refreshToken) {
  const res = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({
        client_id: config.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: config.scopes,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`refresh failed: ${JSON.stringify(data)}`);
  return data;
}

async function getToken() {
  let cached = null;
  try { cached = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); } catch {}
  if (cached?.access_token && cached.expires_at > Date.now() + 60_000) return cached.access_token;
  const data = cached?.refresh_token ? await refresh(cached.refresh_token) : await deviceCodeAuth();
  fs.writeFileSync(
    TOKEN_FILE,
    JSON.stringify({ ...data, expires_at: Date.now() + data.expires_in * 1000 }, null, 2),
    { mode: 0o600 }
  );
  return data.access_token;
}

// ─── Graph ───────────────────────────────────────────────────────────────────

let accessToken;
async function graph(urlPath, { method = 'GET', body } = {}) {
  const res = await fetch(`${GRAPH}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`graph ${method} ${urlPath} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function shareIdFor(url) {
  return 'u!' + Buffer.from(url).toString('base64url').replace(/=+$/, '');
}

async function workbookPath() {
  const item = await graph(`/shares/${shareIdFor(config.shareUrl)}/driveItem`);
  return { driveId: item.parentReference.driveId, itemId: item.id };
}

// Find tab for a date, e.g. "Daily Status Oct -26 to Oct 30" (weeks start Sunday).
function tabNameFor(date, tabs) {
  const d = new Date(date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (const name of tabs) {
    const m = name.match(/(\w+)\s*-?\s*(\d+)\s*(?:to|-)\s*(\w+)?\s*(\d+)/i);
    if (!m) continue;
    const [, m1, d1, m2, d2] = m;
    const start = new Date(d.getFullYear(), months.indexOf(m1.slice(0, 3)), +d1);
    const end = new Date(d.getFullYear(), months.indexOf((m2 || m1).slice(0, 3)), +d2);
    if (d >= start && d <= end) return name;
  }
  return null;
}

const colLetter = (n) => String.fromCharCode(64 + n); // 1 → A
const COLS = { name: 2, project: 3, module: 4, task: 5, scope: 6, status: 7 }; // B,C,D,E,F,G

// Rows grouped by merged date cell in col A — find the block whose date covers today.
function findTodayRange(values, today) {
  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const todayStr = fmt(today);
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] && String(values[i][0]).includes(todayStr)) return { dateRow: i };
  }
  return null;
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };

  accessToken = await getToken();
  const { driveId, itemId } = await workbookPath();
  const wb = `/drives/${driveId}/items/${itemId}/workbook`;
  const sheets = await graph(`${wb}/worksheets`);
  const tabs = sheets.value.map((s) => s.name);

  if (args.includes('--tabs')) return console.log(tabs.join('\n'));

  const today = new Date();
  const tab = tabNameFor(today, tabs);
  if (!tab) throw new Error(`No weekly tab covers ${today.toDateString()} — tabs: ${tabs.join(', ')}`);
  console.error(`Tab: ${tab}`);

  const range = await graph(`${wb}/worksheets('${encodeURIComponent(tab)}')/usedRange`);
  const values = range.values;
  const hit = findTodayRange(values, today);
  if (!hit) throw new Error(`No row dated today (${today.toLocaleDateString('en-GB')}) in tab "${tab}"`);
  const sheetRow = hit.dateRow + 1; // usedRange is 0-based vs sheet 1-based

  if (args.includes('--check')) {
    for (let i = hit.dateRow; i < Math.min(values.length, hit.dateRow + 10); i++) {
      if (i > hit.dateRow && values[i][0]) break; // next date block
      console.log(`row ${i + 1}:`, JSON.stringify(values[i].slice(0, 9)));
    }
    return;
  }

  const write = flag('write');
  if (!write) return console.log('pass --check, --tabs, or --write "<text>"');

  // Find/choose the row for this developer inside today's block.
  let target = -1;
  for (let i = hit.dateRow; i < values.length; i++) {
    if (i > hit.dateRow && values[i][0]) break;
    const name = (values[i][COLS.name - 1] || '').toString().toLowerCase();
    if (name.includes(config.developerName.toLowerCase())) { target = i; break; }
  }
  if (target < 0) {
    // No row for dev today → use first empty row inside the block, else next free row after it.
    let end = hit.dateRow;
    while (end < values.length && (end === hit.dateRow || !values[end][0]) && values[end].some((c) => c !== '' && c !== null)) end++;
    target = end;
    const addr = `A${target + 1}:G${target + 1}`;
    await graph(`${wb}/worksheets('${encodeURIComponent(tab)}')/range(address='${addr}')`, {
      method: 'PATCH',
      body: {
        values: [[null, config.developerName, flag('project') || 'TALC', flag('module') || '',
                  write, flag('scope') || '', flag('status') || '']],
      },
    });
    return console.log(`wrote new row ${target + 1} on "${tab}"`);
  }

  const cell = `${colLetter(COLS.task)}${target + 1}`;
  await graph(`${wb}/worksheets('${encodeURIComponent(tab)}')/range(address='${cell}')`, {
    method: 'PATCH',
    body: { values: [[write]] },
  });
  console.log(`wrote ${cell} (row ${target + 1}, ${config.developerName}) on "${tab}"`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
