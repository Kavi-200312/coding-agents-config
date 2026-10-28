#!/usr/bin/env node
/**
 * Unified AI Agent SSOT Synchronizer (`sync.mjs`)
 * Zero-dependency cross-platform linker, backup manager, and health verifier.
 *
 * Usage:
 *   node sync.mjs                      # Interactive prompt (select which tool to backup & link)
 *   node sync.mjs --status             # Inspect installation & link status across all tools
 *   node sync.mjs devin                # Backup & link only Devin
 *   node sync.mjs antigravity claude   # Backup & link specific tools
 *   node sync.mjs --all                # Backup & link all detected tools
 *   node sync.mjs --relink-files       # Refresh file hardlinks (auto-run by git post-merge hook)
 *   node sync.mjs --unlink <tool|all>  # Remove junctions/hardlinks for a tool
 *   node sync.mjs --install-hooks      # Install git post-merge & post-checkout hooks
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const HUB_ROOT = path.dirname(__filename);
const MANIFEST_PATH = path.join(HUB_ROOT, 'agents.manifest.json');
const ARCHIVE_BASE = path.join(HUB_ROOT, '_archive');
const PLATFORM = os.platform(); // 'win32' | 'darwin' | 'linux'

// ============================================================================
// Pure Path & Filesystem Helpers
// ============================================================================

function expandPathTemplate(template) {
  if (!template) return null;
  const home = os.homedir();
  const appData =
    process.env.APPDATA ||
    (PLATFORM === 'darwin'
      ? path.join(home, 'Library', 'Application Support')
      : path.join(home, '.config'));
  const localAppData = process.env.LOCALAPPDATA || appData;

  return path.resolve(
    template
      .replace(/\{HOME\}/g, home)
      .replace(/\{APPDATA\}/g, appData)
      .replace(/\{LOCALAPPDATA\}/g, localAppData)
      .replace(/\{HUB\}/g, HUB_ROOT)
  );
}

function resolvePlatformTarget(targetMap) {
  const raw = targetMap[PLATFORM] || targetMap.linux || targetMap.win32;
  return expandPathTemplate(raw);
}

function lstatSafe(targetPath) {
  try {
    return fs.lstatSync(targetPath);
  } catch {
    return null;
  }
}

function statSafe(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function realpathSafe(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return null;
  }
}

function normalizeForCompare(p) {
  if (!p) return '';
  const resolved = path.resolve(p).replace(/\\/g, '/');
  return PLATFORM === 'win32' ? resolved.toLowerCase() : resolved;
}

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// ============================================================================
// Link Inspection & Verification Rules
// ============================================================================

function inspectSingleLink(linkSpec) {
  const sourcePath = path.join(HUB_ROOT, linkSpec.source);
  const targetPath = resolvePlatformTarget(linkSpec.target);
  const sourceStat = statSafe(sourcePath);

  if (!sourceStat) {
    return { id: linkSpec.id, type: linkSpec.type, sourcePath, targetPath, state: 'MISSING_SOURCE' };
  }

  if (linkSpec.type === 'file') {
    const targetLstat = lstatSafe(targetPath);
    if (!targetLstat) {
      return { id: linkSpec.id, type: 'file', sourcePath, targetPath, state: 'MISSING' };
    }
    const targetStat = statSafe(targetPath);
    if (targetStat && targetStat.ino === sourceStat.ino && targetStat.size === sourceStat.size) {
      return { id: linkSpec.id, type: 'file', sourcePath, targetPath, state: 'LINKED_HARDLINK' };
    }
    if (
      targetLstat.isSymbolicLink() &&
      normalizeForCompare(realpathSafe(targetPath)) === normalizeForCompare(sourcePath)
    ) {
      return { id: linkSpec.id, type: 'file', sourcePath, targetPath, state: 'LINKED_SYMLINK' };
    }
    return { id: linkSpec.id, type: 'file', sourcePath, targetPath, state: 'UNLINKED_EXISTING_FILE' };
  }

  if (linkSpec.type === 'directory') {
    const targetLstat = lstatSafe(targetPath);
    if (!targetLstat) {
      return { id: linkSpec.id, type: 'directory', sourcePath, targetPath, state: 'MISSING' };
    }
    if (targetLstat.isSymbolicLink()) {
      const real = realpathSafe(targetPath);
      if (normalizeForCompare(real) === normalizeForCompare(sourcePath)) {
        return { id: linkSpec.id, type: 'directory', sourcePath, targetPath, state: 'LINKED_JUNCTION' };
      }
      return { id: linkSpec.id, type: 'directory', sourcePath, targetPath, state: 'STALE_SYMLINK', pointingTo: real };
    }
    return { id: linkSpec.id, type: 'directory', sourcePath, targetPath, state: 'UNLINKED_EXISTING_DIR' };
  }

  if (linkSpec.type === 'children') {
    const targetLstat = lstatSafe(targetPath);
    if (!targetLstat || !targetLstat.isDirectory()) {
      return { id: linkSpec.id, type: 'children', sourcePath, targetPath, state: 'MISSING' };
    }
    const sourceChildren = fs
      .readdirSync(sourcePath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let linkedCount = 0;
    for (const childName of sourceChildren) {
      const childTarget = path.join(targetPath, childName);
      const childLstat = lstatSafe(childTarget);
      if (
        childLstat &&
        childLstat.isSymbolicLink() &&
        normalizeForCompare(realpathSafe(childTarget)) === normalizeForCompare(path.join(sourcePath, childName))
      ) {
        linkedCount++;
      }
    }
    const state =
      linkedCount === sourceChildren.length
        ? 'LINKED_CHILDREN'
        : linkedCount > 0
          ? `PARTIAL_CHILDREN (${linkedCount}/${sourceChildren.length})`
          : 'UNLINKED_CHILDREN';
    return { id: linkSpec.id, type: 'children', sourcePath, targetPath, state };
  }

  return { id: linkSpec.id, type: linkSpec.type, sourcePath, targetPath, state: 'UNKNOWN' };
}

function inspectToolStatus(toolKey, toolConfig) {
  const detectDir = resolvePlatformTarget(toolConfig.detectDirs);
  const installed = Boolean(statSafe(detectDir));
  const linkReports = toolConfig.links.map((l) => inspectSingleLink(l));
  const allLinked = linkReports.every((r) => r.state.startsWith('LINKED_'));
  return {
    toolKey,
    displayName: toolConfig.displayName,
    detectDir,
    installed,
    allLinked,
    linkReports,
  };
}

// ============================================================================
// Step-by-Step Pipeline Operations (Backup -> Clean Legacy -> Link -> Verify)
// ============================================================================

function backupExistingTarget(targetPath, backupDestPath) {
  const lstat = lstatSafe(targetPath);
  if (!lstat) return false;

  // Never back up a symlink/junction itself — just remove the pointer
  if (lstat.isSymbolicLink()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return false;
  }

  fs.mkdirSync(path.dirname(backupDestPath), { recursive: true });
  fs.cpSync(targetPath, backupDestPath, { recursive: true });
  fs.rmSync(targetPath, { recursive: true, force: true });
  return true;
}

function cleanLegacyTargets(linkSpec, backupSessionRoot, toolKey) {
  for (const legacyTpl of linkSpec.legacyTargets || []) {
    const legacyPath = expandPathTemplate(legacyTpl);
    const lstat = lstatSafe(legacyPath);
    if (!lstat) continue;

    if (lstat.isSymbolicLink()) {
      fs.rmSync(legacyPath, { recursive: true, force: true });
      console.log(`  [Cleaned Legacy Link] ${legacyPath}`);
    } else {
      const dest = path.join(backupSessionRoot, toolKey, `legacy_${path.basename(legacyPath)}`);
      backupExistingTarget(legacyPath, dest);
      console.log(`  [Backed Up Legacy Path] ${legacyPath} -> ${dest}`);
    }
  }
}

function syncSingleLink(toolKey, linkSpec, backupSessionRoot, { filesOnly = false } = {}) {
  if (filesOnly && linkSpec.type !== 'file') return { skipped: true };

  const sourcePath = path.join(HUB_ROOT, linkSpec.source);
  const targetPath = resolvePlatformTarget(linkSpec.target);

  cleanLegacyTargets(linkSpec, backupSessionRoot, toolKey);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  // Case 1: File Hardlink (AGENTS.md / GEMINI.md / CLAUDE.md)
  if (linkSpec.type === 'file') {
    const current = inspectSingleLink(linkSpec);
    if (current.state === 'LINKED_HARDLINK') {
      return { id: linkSpec.id, action: 'ALREADY_LINKED', targetPath };
    }
    if (current.state === 'UNLINKED_EXISTING_FILE') {
      const backupDest = path.join(backupSessionRoot, toolKey, path.basename(targetPath));
      backupExistingTarget(targetPath, backupDest);
      console.log(`  [Backup] ${targetPath} -> ${backupDest}`);
    } else if (lstatSafe(targetPath)) {
      fs.rmSync(targetPath, { force: true });
    }

    try {
      fs.linkSync(sourcePath, targetPath);
      return { id: linkSpec.id, action: 'HARDLINKED', targetPath };
    } catch {
      // Cross-volume fallback: symlink or copy
      fs.symlinkSync(sourcePath, targetPath, 'file');
      return { id: linkSpec.id, action: 'SYMLINKED', targetPath };
    }
  }

  // Case 2: Whole Directory Junction / Symlink (skills/ or agents/)
  if (linkSpec.type === 'directory') {
    const current = inspectSingleLink(linkSpec);
    if (current.state === 'LINKED_JUNCTION') {
      return { id: linkSpec.id, action: 'ALREADY_LINKED', targetPath };
    }
    if (current.state === 'UNLINKED_EXISTING_DIR') {
      const backupDest = path.join(backupSessionRoot, toolKey, linkSpec.id);
      backupExistingTarget(targetPath, backupDest);
      console.log(`  [Backup] ${targetPath} -> ${backupDest}`);
    } else if (lstatSafe(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    const symlinkType = PLATFORM === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(sourcePath, targetPath, symlinkType);
    return { id: linkSpec.id, action: 'JUNCTIONED', targetPath };
  }

  // Case 3: Per-Child Directory Junctions (Codex skills/* preserving .system)
  if (linkSpec.type === 'children') {
    fs.mkdirSync(targetPath, { recursive: true });
    const preserve = new Set(linkSpec.preserveChildren || []);
    const sourceChildren = fs
      .readdirSync(sourcePath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    const sourceSet = new Set(sourceChildren);

    // Clean or backup existing children in targetPath
    for (const existing of fs.readdirSync(targetPath)) {
      if (preserve.has(existing)) continue;
      const fullExisting = path.join(targetPath, existing);
      const lstat = lstatSafe(fullExisting);
      if (!lstat) continue;

      if (lstat.isSymbolicLink()) {
        const real = realpathSafe(fullExisting);
        const expected = path.join(sourcePath, existing);
        if (!sourceSet.has(existing) || normalizeForCompare(real) !== normalizeForCompare(expected)) {
          fs.rmSync(fullExisting, { recursive: true, force: true });
        }
      } else {
        const backupDest = path.join(backupSessionRoot, toolKey, linkSpec.id, existing);
        backupExistingTarget(fullExisting, backupDest);
        console.log(`  [Backup] ${fullExisting} -> ${backupDest}`);
      }
    }

    const symlinkType = PLATFORM === 'win32' ? 'junction' : 'dir';
    for (const childName of sourceChildren) {
      const childTarget = path.join(targetPath, childName);
      if (!lstatSafe(childTarget)) {
        fs.symlinkSync(path.join(sourcePath, childName), childTarget, symlinkType);
      }
    }
    return { id: linkSpec.id, action: `JUNCTIONED_${sourceChildren.length}_CHILDREN`, targetPath };
  }

  return { id: linkSpec.id, action: 'UNSUPPORTED', targetPath };
}

function unlinkTool(toolKey, toolConfig) {
  console.log(`\nUnlinking ${toolConfig.displayName} (${toolKey})...`);
  for (const linkSpec of toolConfig.links) {
    const targetPath = resolvePlatformTarget(linkSpec.target);
    if (linkSpec.type === 'children') {
      if (!lstatSafe(targetPath)) continue;
      const preserve = new Set(linkSpec.preserveChildren || []);
      for (const entry of fs.readdirSync(targetPath)) {
        if (preserve.has(entry)) continue;
        const childPath = path.join(targetPath, entry);
        if (lstatSafe(childPath)?.isSymbolicLink()) {
          fs.rmSync(childPath, { recursive: true, force: true });
          console.log(`  Removed child junction: ${childPath}`);
        }
      }
    } else {
      const lstat = lstatSafe(targetPath);
      if (!lstat) continue;
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`  Removed link: ${targetPath}`);
    }
  }
}

function installGitHooks() {
  const gitHooksDir = path.join(HUB_ROOT, '.git', 'hooks');
  if (!statSafe(gitHooksDir)) return false;

  const hookScript = `#!/bin/sh
# Auto-generated by sync.mjs — refreshes AGENTS.md hardlinks after git pull/checkout
node "${HUB_ROOT.replace(/\\/g, '/')}/sync.mjs" --relink-files >/dev/null 2>&1 || true
`;

  for (const hookName of ['post-merge', 'post-checkout']) {
    const hookPath = path.join(gitHooksDir, hookName);
    fs.writeFileSync(hookPath, hookScript, { encoding: 'utf8', mode: 0o755 });
  }
  return true;
}

// ============================================================================
// Status Printer & Interactive CLI Orchestration
// ============================================================================

function printStatusTable(manifest) {
  const toolKeys = Object.keys(manifest.tools);
  console.log('\n=== Unified AI Agent SSOT Hub Status ===');
  console.log(`Hub Root : ${HUB_ROOT}`);
  console.log(`Platform : ${PLATFORM}\n`);

  for (const [idx, key] of toolKeys.entries()) {
    const status = inspectToolStatus(key, manifest.tools[key]);
    const badge = status.allLinked
      ? 'LINKED (OK)'
      : status.installed
        ? 'UNLINKED / DRIFTED'
        : 'NOT INSTALLED';
    console.log(`[${idx + 1}] ${key.padEnd(13)} | ${status.displayName.padEnd(28)} | ${badge}`);
    for (const r of status.linkReports) {
      console.log(`      - ${r.id.padEnd(20)} : ${r.state.padEnd(24)} -> ${r.targetPath}`);
    }
  }
  console.log('');
}

async function promptSelection(manifest) {
  printStatusTable(manifest);
  const toolKeys = Object.keys(manifest.tools);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(
      `Enter tool name(s) or number(s) to backup & link (e.g. "devin", "1 2", or "all") [q to cancel]: `,
      resolve
    );
  });
  rl.close();

  const trimmed = (answer || '').trim().toLowerCase();
  if (!trimmed || trimmed === 'q' || trimmed === 'quit') return [];
  if (trimmed === 'a' || trimmed === 'all') {
    return toolKeys.filter((k) => inspectToolStatus(k, manifest.tools[k]).installed);
  }

  const tokens = trimmed.split(/[\s,]+/);
  const selected = new Set();
  for (const tok of tokens) {
    const num = Number(tok);
    if (Number.isInteger(num) && num >= 1 && num <= toolKeys.length) {
      selected.add(toolKeys[num - 1]);
    } else if (manifest.tools[tok]) {
      selected.add(tok);
    }
  }
  return [...selected];
}

async function main() {
  // Step 1: Load declarative manifest
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node sync.mjs                      # Interactive tool selector
  node sync.mjs --status             # Show link & inode health across all tools
  node sync.mjs <tool...>            # Backup & link specific tool(s): antigravity | devin | codex | claude
  node sync.mjs --all                # Backup & link all installed tools
  node sync.mjs --relink-files       # Refresh hardlinks after git pull/checkout
  node sync.mjs --unlink <tool|all>  # Unlink a tool or all tools
  node sync.mjs --install-hooks      # Install git post-merge/post-checkout hooks`);
    return;
  }

  if (args.includes('--status')) {
    printStatusTable(manifest);
    return;
  }

  if (args.includes('--install-hooks')) {
    const ok = installGitHooks();
    console.log(ok ? 'Installed git post-merge and post-checkout hooks.' : 'No .git directory found.');
    return;
  }

  if (args.includes('--unlink')) {
    const targetArg = args[args.indexOf('--unlink') + 1] || '';
    const targets =
      targetArg === 'all'
        ? Object.keys(manifest.tools)
        : Object.keys(manifest.tools).filter((k) => args.includes(k));
    for (const k of targets) {
      unlinkTool(k, manifest.tools[k]);
    }
    return;
  }

  // Step 2: Resolve target tools to synchronize
  const filesOnly = args.includes('--relink-files');
  let selectedTools = [];

  if (args.includes('--all') || filesOnly) {
    selectedTools = Object.keys(manifest.tools).filter(
      (k) => inspectToolStatus(k, manifest.tools[k]).installed
    );
  } else {
    selectedTools = args.filter((a) => !a.startsWith('-') && manifest.tools[a]);
  }

  if (selectedTools.length === 0 && !filesOnly) {
    selectedTools = await promptSelection(manifest);
  }

  if (selectedTools.length === 0) {
    console.log('No tools selected. Exiting.');
    return;
  }

  // Step 3: Execute backup + link pipeline for each selected tool
  const backupSessionRoot = path.join(ARCHIVE_BASE, `${formatTimestamp()}_sync-backup`);
  for (const toolKey of selectedTools) {
    const toolConfig = manifest.tools[toolKey];
    if (!filesOnly) {
      console.log(`\nSyncing [${toolKey}] (${toolConfig.displayName})...`);
    }
    for (const linkSpec of toolConfig.links) {
      const result = syncSingleLink(toolKey, linkSpec, backupSessionRoot, { filesOnly });
      if (!filesOnly && !result.skipped) {
        console.log(`  [${result.action}] ${result.id} -> ${result.targetPath}`);
      }
    }
  }

  // Step 4: Ensure git post-merge & post-checkout hooks are active
  installGitHooks();

  // Step 5: Verify final link states
  if (!filesOnly) {
    printStatusTable(manifest);
  }
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
