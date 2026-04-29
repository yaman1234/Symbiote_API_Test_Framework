const fs = require('fs');
const XLSX = require('xlsx');
const { tokenSimilarity, normalizePathForCompare } = require('./testcase-sync/shared');

const wb = XLSX.readFile('Master_TestCases.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets.TestCases_Master, { defval: '' });

const bySpec = new Map();
for (const row of rows) {
  const key = normalizePathForCompare(row.Spec_File);
  if (!key) continue;
  if (!bySpec.has(key)) bySpec.set(key, []);
  bySpec.get(key).push(row);
}

function suiteOf(filePath) {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/negative/')) return 'negative';
  if (p.includes('/smoke/')) return 'smoke';
  if (p.includes('/regression/')) return 'regression';
  return 'test';
}

function statusFromExpected(expected) {
  const text = String(expected || '');
  const exact = text.match(/(\d{3})/);
  if (exact) return exact[1];
  const group = text.match(/\b([24]xx)\b/i);
  if (group) return group[1].toUpperCase();
  return '';
}

function endpointLabelFromTcId(tcId) {
  const id = String(tcId || '');
  if (id.startsWith('AUTH-LOGIN-')) return 'Login';
  if (id.startsWith('AUTH-SENDOTP-')) return 'Send OTP';
  if (id.startsWith('AUTH-VERIFY-')) return 'Verify OTP';
  if (id.startsWith('AUTH-REFRESH-')) return 'Refresh Token';
  if (id.startsWith('AUTH-FORGOT-')) return 'Forgot Password';
  if (id.startsWith('AUTH-PACT-')) return 'Password Action Validate';
  if (id.startsWith('AUTH-SETPW-')) return 'Set Password';
  if (id.startsWith('ORGS-USERS-GET-')) return 'Get Org User';
  if (id.startsWith('ORGS-USERS-')) return 'List Org Users';
  if (id.startsWith('ORGS-OPTS-')) return 'User Options';
  if (id.startsWith('ORGS-CREATE-')) return 'Create Org User';
  if (id.startsWith('ORGS-PATCH-')) return 'Update Org User';
  if (id.startsWith('TASKS-LIST-')) return 'List Tasks';
  if (id.startsWith('MISC-PROT-')) return 'Protected Route';
  if (id.startsWith('TEMPLATE-')) return 'Template Endpoint';
  return 'API Scenario';
}

function candidatesFor(specFile) {
  const normalized = normalizePathForCompare(specFile);
  let candidates = bySpec.get(normalized) || [];
  if (!candidates.length) {
    candidates = rows.filter((row) => {
      const mapped = normalizePathForCompare(row.Spec_File);
      return mapped.endsWith(normalized) || normalized.endsWith(mapped);
    });
  }
  return candidates;
}

function walkSpecs(dirPath, out = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry.name}`;
    if (entry.isDirectory()) {
      walkSpecs(fullPath, out);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.spec.js')) out.push(fullPath);
  }
  return out;
}

const files = walkSpecs('tests/api');
let changedFiles = 0;
let changedTitles = 0;
let totalTests = 0;
let unmapped = 0;

for (const filePath of files) {
  const source = fs.readFileSync(filePath, 'utf8');
  const candidates = candidatesFor(filePath);
  const usedTcIds = new Set();
  const suite = suiteOf(filePath);

  const testRegex = /test\(\s*(['"`])([\s\S]*?)\1\s*,/g;
  let match;
  let cursor = 0;
  let output = '';
  let fileChanged = false;

  while ((match = testRegex.exec(source))) {
    totalTests += 1;
    const quote = match[1];
    const oldTitle = match[2];
    let selected = null;

    const tcInTitle = oldTitle.match(/\[(?:TC:)?([A-Z0-9-]+)\]/);
    if (tcInTitle) {
      selected = candidates.find((row) => String(row.TC_ID) === tcInTitle[1]) || null;
    }

    if (!selected) {
      let best = null;
      for (const row of candidates) {
        if (usedTcIds.has(row.TC_ID)) continue;
        let score = tokenSimilarity(row.Scenario, oldTitle);
        if (oldTitle.includes(String(row.TC_ID))) score += 0.5;
        if (!best || score > best.score) best = { row, score };
      }
      if (best && best.score >= 0.2) selected = best.row;
    }

    if (!selected) {
      unmapped += 1;
      continue;
    }

    usedTcIds.add(selected.TC_ID);
    const statusCode = statusFromExpected(selected.Expected);
    const suffix = statusCode ? ` → ${statusCode}` : '';
    const newTitle = `[${selected.TC_ID}] : ${selected.Scenario}${suffix}`;

    if (newTitle !== oldTitle) {
      output += source.slice(cursor, match.index);
      output += `test(${quote}${newTitle}${quote},`;
      cursor = testRegex.lastIndex;
      fileChanged = true;
      changedTitles += 1;
    }
  }

  if (fileChanged) {
    output += source.slice(cursor);
    fs.writeFileSync(filePath, output, 'utf8');
    changedFiles += 1;
  }
}

console.log(JSON.stringify({ files: files.length, totalTests, changedFiles, changedTitles, unmapped }, null, 2));
