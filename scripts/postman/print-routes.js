/**
 * Prints a deduped inventory of HTTP routes referenced in Playwright API specs.
 * Run: node scripts/postman/print-routes.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', 'tests', 'api');

/** Normalize template-literal path segments to Postman-style placeholders */
function normalizePathArg(arg) {
  let s = String(arg || '').trim();
  if (!s) return s;
  const replacements = [
    [/\$\{session\.orgId\}/g, '{{orgId}}'],
    [/\$\{ownerSession\.orgId\}/g, '{{orgId}}'],
    [/\$\{supervisorSession\.orgId\}/g, '{{orgId}}'],
    [/\$\{env\.TASKS_BRANCH_ID\}/g, '{{branchId}}'],
    [/\$\{branchId\}/g, '{{branchId}}'],
    [/\$\{wrongBranchId\}/g, '{{wrongBranchId}}'],
    [/\$\{taskId\}/g, '{{taskId}}'],
    [/\$\{parentTaskId\}/g, '{{parentTaskId}}'],
    [/\$\{parentId\}/g, '{{parentTaskId}}'],
    [/\$\{movedTaskId\}/g, '{{taskId}}'],
    [/\$\{subtaskId\}/g, '{{subtaskId}}'],
    [/\$\{subtaskAId\}/g, '{{subtaskId}}'],
    [/\$\{commentId\}/g, '{{commentId}}'],
    [/\$\{createdTaskId\}/g, '{{taskId}}'],
    [/\$\{createdStatusId\}/g, '{{statusId}}'],
    [/\$\{createdPriorityId\}/g, '{{priorityId}}'],
    [/\$\{createdFilterId\}/g, '{{filterId}}'],
    [/\$\{statusId\}/g, '{{statusId}}'],
    [/\$\{priorityId\}/g, '{{priorityId}}'],
    [/\$\{sampleNotificationId\}/g, '{{notificationId}}'],
    [/\$\{unknownTaskId\}/g, '{{taskId}}'],
    [/\$\{updateTaskId\}/g, '{{taskId}}'],
    [/\$\{recurringTaskId\}/g, '{{taskId}}'],
    [/\$\{seed\.taskId\}/g, '{{taskId}}'],
    [/\$\{parent\.taskId\}/g, '{{parentTaskId}}'],
    [/\$\{basePath\}/g, '{{notificationBasePath}}'],
    [/\$\{[^}]+\}/g, '{{param}}']
  ];
  for (const [re, to] of replacements) {
    s = s.replace(re, to);
  }
  return s.replace(/\{\{param\}\}\/\{\{param\}\}/g, '{{param}}/{{param}}');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.spec.js')) out.push(full);
  }
  return out;
}

function extractCalls(content) {
  const results = [];
  const re =
    /client\.(get|post|patch|put|delete)\(\s*((?:'[^']*'|"[^"]*"|`[^`]*`))/gs;
  let m;
  while ((m = re.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    let raw = m[2];
    if (raw.startsWith("'") || raw.startsWith('"')) {
      raw = raw.slice(1, -1);
      results.push({ method, path: raw, kind: 'static' });
    } else if (raw.startsWith('`')) {
      raw = raw.slice(1, -1);
      results.push({ method, path: normalizePathArg(raw), kind: 'template' });
    }
  }
  return results;
}

/** Path templates assigned to variables (used with client.get(path) etc.) */
function extractAssignedOrgTemplates(content) {
  const paths = new Set();
  const assignRe =
    /(?:const|let)\s+\w+\s*=\s*`((?:orgs|auth)\/[^`]+)`/g;
  let m;
  while ((m = assignRe.exec(content)) !== null) {
    paths.add(normalizePathArg(m[1]));
  }
  return [...paths];
}

function main() {
  const specs = walk(ROOT);
  const keyToFiles = new Map();

  for (const file of specs) {
    const rel = path.relative(path.resolve(ROOT, '..', '..'), file).split(path.sep).join('/');
    const content = fs.readFileSync(file, 'utf8');
    for (const { method, path: p } of extractCalls(content)) {
      if (!p) continue;
      const key = `${method} ${p}`;
      if (!keyToFiles.has(key)) keyToFiles.set(key, new Set());
      keyToFiles.get(key).add(rel);
    }
    for (const p of extractAssignedOrgTemplates(content)) {
      if (!p || p.includes('{{param}}')) continue;
      const key = `* ${p}`;
      if (!keyToFiles.has(key)) keyToFiles.set(key, new Set());
      keyToFiles.get(key).add(rel);
    }
  }

  const rows = [...keyToFiles.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  console.log('Method\tPath template\tSpec files');
  for (const [key, files] of rows) {
    const [method, ...pathParts] = key.split(' ');
    const p = pathParts.join(' ');
    console.log(`${method}\t${p}\t${[...files].sort().join(', ')}`);
  }
  console.log(`\nTotal unique entries: ${rows.length}`);
}

main();
