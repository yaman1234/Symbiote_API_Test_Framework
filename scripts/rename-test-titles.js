const path = require('path');
const fs = require('fs');
const { tokenSimilarity, normalizePathForCompare } = require('./testcase-sync/shared');
const { readMasterRowsFromFile } = require('./testcase-sync/master-workbook');

const MASTER_PATH = path.resolve(process.cwd(), 'Master_TestCases.xlsx');

function statusFromExpected(expected) {
  const text = String(expected || '');
  const exact = text.match(/(\d{3})/);
  if (exact) return exact[1];
  const group = text.match(/\b([24]xx)\b/i);
  if (group) return group[1].toUpperCase();
  return '';
}

function candidatesFor(specFile, rows, bySpec) {
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

async function main() {
  if (!fs.existsSync(MASTER_PATH)) {
    console.error(`Missing ${MASTER_PATH}`);
    process.exit(1);
  }
  const rows = await readMasterRowsFromFile(MASTER_PATH);

  const bySpec = new Map();
  for (const row of rows) {
    const key = normalizePathForCompare(row.Spec_File);
    if (!key) continue;
    if (!bySpec.has(key)) bySpec.set(key, []);
    bySpec.get(key).push(row);
  }

  const files = walkSpecs('tests/api');
  let changedFiles = 0;
  let changedTitles = 0;
  let totalTests = 0;
  let unmapped = 0;

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const candidates = candidatesFor(filePath, rows, bySpec);
    const usedTcIds = new Set();

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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
