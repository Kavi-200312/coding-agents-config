#!/usr/bin/env node
/**
 * Unified AI Agent SSOT Synchronizer (`sync.mjs`)
 * Zero-dependency cross-platform linker, backup manager, validator, and health verifier.
 *
 * Usage:
 *   node sync.mjs                      # Interactive prompt (select which tool to backup & link)
 *   node sync.mjs --status             # Inspect installation & link status across all tools
 *   node sync.mjs --validate           # Automated validation of skills, frontmatter, links, manifest
 *   node sync.mjs <tool...>            # Backup & link specific tool(s): antigravity | devin | codex | claude
 *   node sync.mjs --all                # Backup & link all detected tools
 *   node sync.mjs --dry-run [tool|all] # Simulate sync without modifying filesystem
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
    for (const child of sourceChildren) {
      const childTarget = path.join(targetPath, child);
      const childExpected = path.join(sourcePath, child);
      const childLstat = lstatSafe(childTarget);
      if (
        childLstat?.isSymbolicLink() &&
        normalizeForCompare(realpathSafe(childTarget)) === normalizeForCompare(childExpected)
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

function backupExistingTarget(targetPath, backupDestPath, { dryRun = false } = {}) {
  const lstat = lstatSafe(targetPath);
  if (!lstat) return false;

  // Never back up a symlink/junction itself — just remove the pointer
  if (lstat.isSymbolicLink()) {
    if (!dryRun) fs.rmSync(targetPath, { recursive: true, force: true });
    return false;
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would backup: ${targetPath} -> ${backupDestPath}`);
    return true;
  }

  fs.mkdirSync(path.dirname(backupDestPath), { recursive: true });
  fs.cpSync(targetPath, backupDestPath, { recursive: true });
  fs.rmSync(targetPath, { recursive: true, force: true });
  return true;
}

function cleanLegacyTargets(linkSpec, backupSessionRoot, toolKey, { dryRun = false } = {}) {
  for (const legacyTpl of linkSpec.legacyTargets || []) {
    const legacyPath = expandPathTemplate(legacyTpl);
    const lstat = lstatSafe(legacyPath);
    if (!lstat) continue;

    if (lstat.isSymbolicLink()) {
      if (!dryRun) fs.rmSync(legacyPath, { recursive: true, force: true });
      console.log(`  [${dryRun ? 'DRY-RUN Would Clean' : 'Cleaned'} Legacy Link] ${legacyPath}`);
    } else {
      const dest = path.join(backupSessionRoot, toolKey, `legacy_${path.basename(legacyPath)}`);
      backupExistingTarget(legacyPath, dest, { dryRun });
      console.log(`  [${dryRun ? 'DRY-RUN Would Backup' : 'Backed Up'} Legacy Path] ${legacyPath} -> ${dest}`);
    }
  }
}

function syncSingleLink(toolKey, linkSpec, backupSessionRoot, { filesOnly = false, dryRun = false } = {}) {
  if (filesOnly && linkSpec.type !== 'file') return { skipped: true };

  const sourcePath = path.join(HUB_ROOT, linkSpec.source);
  const targetPath = resolvePlatformTarget(linkSpec.target);

  cleanLegacyTargets(linkSpec, backupSessionRoot, toolKey, { dryRun });
  if (!dryRun) fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  // Case 1: File Hardlink (AGENTS.md / GEMINI.md / CLAUDE.md)
  if (linkSpec.type === 'file') {
    const current = inspectSingleLink(linkSpec);
    if (current.state === 'LINKED_HARDLINK') {
      return { id: linkSpec.id, action: 'ALREADY_LINKED', targetPath };
    }
    if (current.state === 'UNLINKED_EXISTING_FILE') {
      const backupDest = path.join(backupSessionRoot, toolKey, path.basename(targetPath));
      backupExistingTarget(targetPath, backupDest, { dryRun });
      console.log(`  [${dryRun ? 'DRY-RUN Would Backup' : 'Backup'}] ${targetPath} -> ${backupDest}`);
    } else if (lstatSafe(targetPath) && !dryRun) {
      fs.rmSync(targetPath, { force: true });
    }

    if (dryRun) {
      return { id: linkSpec.id, action: 'DRY-RUN HARDLINK', targetPath };
    }

    try {
      fs.linkSync(sourcePath, targetPath);
      return { id: linkSpec.id, action: 'HARDLINKED', targetPath };
    } catch {
      // Cross-volume fallback: symlink
      fs.symlinkSync(sourcePath, targetPath, 'file');
      return { id: linkSpec.id, action: 'SYMLINKED', targetPath };
    }
  }

  // Case 2: Whole Directory Junction / Symlink (e.g. skills/)
  if (linkSpec.type === 'directory') {
    const current = inspectSingleLink(linkSpec);
    if (current.state === 'LINKED_JUNCTION') {
      return { id: linkSpec.id, action: 'ALREADY_LINKED', targetPath };
    }
    if (current.state === 'UNLINKED_EXISTING_DIR') {
      const backupDest = path.join(backupSessionRoot, toolKey, linkSpec.id);
      backupExistingTarget(targetPath, backupDest, { dryRun });
      console.log(`  [${dryRun ? 'DRY-RUN Would Backup' : 'Backup'}] ${targetPath} -> ${backupDest}`);
    } else if (lstatSafe(targetPath) && !dryRun) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    const symlinkType = PLATFORM === 'win32' ? 'junction' : 'dir';
    if (dryRun) {
      return { id: linkSpec.id, action: `DRY-RUN ${symlinkType.toUpperCase()}`, targetPath };
    }
    fs.symlinkSync(sourcePath, targetPath, symlinkType);
    return { id: linkSpec.id, action: 'JUNCTIONED', targetPath };
  }

  // Case 3: Per-Child Directory Junctions (Codex skills/* preserving .system)
  if (linkSpec.type === 'children') {
    if (!dryRun) fs.mkdirSync(targetPath, { recursive: true });
    const preserve = new Set(linkSpec.preserveChildren || []);
    const sourceChildren = fs
      .readdirSync(sourcePath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    const sourceSet = new Set(sourceChildren);

    if (lstatSafe(targetPath)) {
      for (const existing of fs.readdirSync(targetPath)) {
        if (preserve.has(existing)) continue;
        const fullExisting = path.join(targetPath, existing);
        const lstat = lstatSafe(fullExisting);
        if (!lstat) continue;

        if (lstat.isSymbolicLink()) {
          const real = realpathSafe(fullExisting);
          const expected = path.join(sourcePath, existing);
          const pointsIntoHub = normalizeForCompare(real).startsWith(normalizeForCompare(sourcePath));

          if (pointsIntoHub) {
            // Prune only orphaned links originating from this hub
            if (!sourceSet.has(existing) || normalizeForCompare(real) !== normalizeForCompare(expected)) {
              if (!dryRun) fs.rmSync(fullExisting, { recursive: true, force: true });
              console.log(`  [${dryRun ? 'DRY-RUN Would Prune' : 'Pruned Orphan Hub Link'}] ${fullExisting}`);
            }
          } else {
            // External symlink not created by this hub: preserve untouched
            console.log(`  [Preserved External Symlink] ${fullExisting} -> ${real}`);
          }
        } else {
          const backupDest = path.join(backupSessionRoot, toolKey, linkSpec.id, existing);
          backupExistingTarget(fullExisting, backupDest, { dryRun });
          console.log(`  [${dryRun ? 'DRY-RUN Would Backup' : 'Backup'}] ${fullExisting} -> ${backupDest}`);
        }
      }
    }

    const symlinkType = PLATFORM === 'win32' ? 'junction' : 'dir';
    let newLinks = 0;
    for (const childName of sourceChildren) {
      const childTarget = path.join(targetPath, childName);
      if (!lstatSafe(childTarget)) {
        newLinks++;
        if (!dryRun) {
          fs.symlinkSync(path.join(sourcePath, childName), childTarget, symlinkType);
        }
      }
    }
    const prefix = dryRun ? 'DRY-RUN ' : '';
    return {
      id: linkSpec.id,
      action: `${prefix}JUNCTIONED_${sourceChildren.length}_CHILDREN${newLinks > 0 ? ` (${newLinks} new)` : ''}`,
      targetPath,
    };
  }

  return { id: linkSpec.id, action: 'UNSUPPORTED', targetPath };
}

function unlinkTool(toolKey, toolConfig, { dryRun = false } = {}) {
  console.log(`\nUnlinking ${toolConfig.displayName} (${toolKey})${dryRun ? ' [DRY-RUN]' : ''}...`);
  for (const linkSpec of toolConfig.links) {
    const targetPath = resolvePlatformTarget(linkSpec.target);
    if (linkSpec.type === 'children') {
      if (!lstatSafe(targetPath)) continue;
      const preserve = new Set(linkSpec.preserveChildren || []);
      for (const entry of fs.readdirSync(targetPath)) {
        if (preserve.has(entry)) continue;
        const childPath = path.join(targetPath, entry);
        if (lstatSafe(childPath)?.isSymbolicLink()) {
          const real = realpathSafe(childPath);
          const sourcePath = path.join(HUB_ROOT, linkSpec.source);
          if (normalizeForCompare(real).startsWith(normalizeForCompare(sourcePath))) {
            if (!dryRun) fs.rmSync(childPath, { recursive: true, force: true });
            console.log(`  ${dryRun ? 'Would remove' : 'Removed'} child junction: ${childPath}`);
          }
        }
      }
    } else {
      const lstat = lstatSafe(targetPath);
      if (!lstat) continue;
      if (!dryRun) fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`  ${dryRun ? 'Would remove' : 'Removed'} link: ${targetPath}`);
    }
  }
}

function installGitHooks({ dryRun = false } = {}) {
  const gitHooksDir = path.join(HUB_ROOT, '.git', 'hooks');
  if (!statSafe(gitHooksDir)) return false;

  const hookScript = `#!/bin/sh
# Auto-generated by sync.mjs — refreshes AGENTS.md hardlinks after git pull/checkout
node "${HUB_ROOT.replace(/\\/g, '/')}/sync.mjs" --relink-files >/dev/null 2>&1 || true
`;

  for (const hookName of ['post-merge', 'post-checkout']) {
    const hookPath = path.join(gitHooksDir, hookName);
    const existing = statSafe(hookPath);
    if (existing) {
      const content = fs.readFileSync(hookPath, 'utf8');
      if (content.includes('sync.mjs')) {
        continue;
      }
      const backupPath = `${hookPath}.orig`;
      if (!statSafe(backupPath) && !dryRun) {
        fs.copyFileSync(hookPath, backupPath);
        console.log(`  [Backed Up Git Hook] ${hookPath} -> ${backupPath}`);
      }
    }
    if (!dryRun) {
      fs.writeFileSync(hookPath, hookScript, { encoding: 'utf8', mode: 0o755 });
    }
  }
  return true;
}

// ============================================================================
// Hub Health & Integrity Validation
// ============================================================================

function validateHub(manifest) {
  console.log('\n=== Validating SSOT Hub Integrity ===\n');
  let errors = 0;
  let warnings = 0;

  // 1. Core Hub Files
  const coreFiles = ['AGENTS.md', 'agents.manifest.json', '.skill-lock.json', 'README.md', 'BOOTSTRAP.md'];
  for (const f of coreFiles) {
    const full = path.join(HUB_ROOT, f);
    if (!statSafe(full)) {
      console.log(`❌ Missing core file: ${f}`);
      errors++;
    } else {
      console.log(`✓ Core file present: ${f}`);
    }
  }

  // 2. Skills Validation
  const skillsDir = path.join(HUB_ROOT, 'skills');
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`\nValidating ${skillDirs.length} skills in skills/...`);
  let validFrontmatterCount = 0;
  let linkChecksCount = 0;
  let brokenLinksCount = 0;

  for (const skill of skillDirs) {
    const skillPath = path.join(skillsDir, skill);
    const skillMd = path.join(skillPath, 'SKILL.md');
    if (!statSafe(skillMd)) {
      console.log(`❌ [${skill}] Missing SKILL.md`);
      errors++;
      continue;
    }

    const content = fs.readFileSync(skillMd, 'utf8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      console.log(`❌ [${skill}] Invalid or missing YAML frontmatter in SKILL.md`);
      errors++;
    } else {
      const fm = fmMatch[1];
      const hasName = /^name:\s*.+/m.test(fm);
      const hasDesc = /^description:\s*.+/m.test(fm);
      if (!hasName || !hasDesc) {
        console.log(`❌ [${skill}] Frontmatter missing 'name' or 'description' in SKILL.md`);
        errors++;
      } else {
        validFrontmatterCount++;
      }
    }

    // Check markdown relative links in prose (stripping fenced code blocks)
    const checkLinksInFile = (filePath) => {
      let text = fs.readFileSync(filePath, 'utf8');
      text = text.replace(/```[\s\S]*?```/g, ''); // ignore code blocks
      text = text.replace(/`[^`\n]+`/g, '');      // ignore inline code
      const relDir = path.dirname(filePath);
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(text)) !== null) {
        const rawTarget = match[2].trim();
        if (
          rawTarget.startsWith('http://') ||
          rawTarget.startsWith('https://') ||
          rawTarget.startsWith('#') ||
          rawTarget.startsWith('mailto:') ||
          rawTarget.startsWith('file://')
        ) {
          continue;
        }
        const [cleanTarget] = rawTarget.split('#');
        if (!cleanTarget) continue;

        linkChecksCount++;
        const resolved = path.resolve(relDir, cleanTarget);
        if (!statSafe(resolved)) {
          console.log(`❌ [${skill}] Broken link in ${path.relative(HUB_ROOT, filePath)}: "${rawTarget}" -> target not found`);
          brokenLinksCount++;
          errors++;
        }
      }
    };

    const walkMarkdown = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkMarkdown(full);
        } else if (entry.name.endsWith('.md')) {
          checkLinksInFile(full);
        }
      }
    };
    walkMarkdown(skillPath);
  }

  console.log(`✓ Frontmatter valid: ${validFrontmatterCount}/${skillDirs.length} skills`);
  console.log(`✓ Markdown links checked: ${linkChecksCount} (${brokenLinksCount} broken)`);

  // 3. Manifest Link Status
  console.log('\nChecking OS link status across registered tools...');
  let toolChecks = 0;
  let toolOk = 0;
  for (const [toolKey, toolConfig] of Object.entries(manifest.tools)) {
    const status = inspectToolStatus(toolKey, toolConfig);
    if (!status.installed) {
      console.log(`- ${toolKey.padEnd(14)} : NOT INSTALLED on this system (skipped)`);
      continue;
    }
    toolChecks++;
    if (status.allLinked) {
      toolOk++;
      console.log(`✓ ${toolKey.padEnd(14)} : ALL LINKS OK (${status.displayName})`);
    } else {
      console.log(`⚠️  ${toolKey.padEnd(14)} : UNLINKED OR DRIFTED (${status.displayName})`);
      warnings++;
    }
  }

  console.log('\n=== Validation Summary ===');
  console.log(`Total Errors   : ${errors}`);
  console.log(`Total Warnings : ${warnings}`);
  return errors === 0;
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
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const rawArgs = process.argv.slice(2);
  const dryRun = rawArgs.includes('--dry-run');
  const args = rawArgs.filter((a) => a !== '--dry-run');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node sync.mjs                      # Interactive tool selector
  node sync.mjs --status             # Show link & inode health across all tools
  node sync.mjs --validate           # Validate skills frontmatter, links, and manifest
  node sync.mjs <tool...>            # Backup & link specific tool(s): antigravity | devin | codex | claude
  node sync.mjs --all                # Backup & link all installed tools
  node sync.mjs --dry-run [tool|all] # Dry-run simulation (no changes written)
  node sync.mjs --relink-files       # Refresh hardlinks after git pull/checkout
  node sync.mjs --unlink <tool|all>  # Unlink a tool or all tools
  node sync.mjs --install-hooks      # Install git post-merge/post-checkout hooks`);
    return;
  }

  if (args.includes('--validate')) {
    const ok = validateHub(manifest);
    process.exit(ok ? 0 : 1);
  }

  if (args.includes('--status')) {
    printStatusTable(manifest);
    return;
  }

  if (args.includes('--install-hooks')) {
    const ok = installGitHooks({ dryRun });
    console.log(ok ? `Installed git post-merge and post-checkout hooks${dryRun ? ' [DRY-RUN]' : ''}.` : 'No .git directory found.');
    return;
  }

  if (args.includes('--unlink')) {
    const targetArg = args[args.indexOf('--unlink') + 1] || '';
    const targets =
      targetArg === 'all'
        ? Object.keys(manifest.tools)
        : Object.keys(manifest.tools).filter((k) => args.includes(k));
    for (const k of targets) {
      unlinkTool(k, manifest.tools[k], { dryRun });
    }
    return;
  }

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

  if (dryRun) {
    console.log('\n[INFO] Running in DRY-RUN mode. No files or links will be modified.');
  }

  const backupSessionRoot = path.join(ARCHIVE_BASE, `${formatTimestamp()}_sync-backup`);
  for (const toolKey of selectedTools) {
    const toolConfig = manifest.tools[toolKey];
    if (!filesOnly) {
      console.log(`\nSyncing [${toolKey}] (${toolConfig.displayName})${dryRun ? ' [DRY-RUN]' : ''}...`);
    }
    for (const linkSpec of toolConfig.links) {
      const result = syncSingleLink(toolKey, linkSpec, backupSessionRoot, { filesOnly, dryRun });
      if (!filesOnly && !result.skipped) {
        console.log(`  [${result.action}] ${result.id} -> ${result.targetPath}`);
      }
    }
  }

  installGitHooks({ dryRun });

  if (!filesOnly && !dryRun) {
    printStatusTable(manifest);
  }
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
