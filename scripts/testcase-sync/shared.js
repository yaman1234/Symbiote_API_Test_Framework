const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const MASTER_XLSX_PATH = path.resolve(process.cwd(), 'Master_TestCases.xlsx');
const TESTCASES_DIR = path.resolve(process.cwd(), 'testCases');
const REPORT_DIR = path.resolve(process.cwd(), 'reports', 'testcase-sync');
const PLAYWRIGHT_JSON_PATH = path.resolve(process.cwd(), 'reports', 'json', 'results.json');

const MASTER_COLUMNS = [
  'TC_ID',
  'API',
  'Method',
  'Endpoint',
  'Suite',
  'Spec_File',
  'Scenario',
  'Expected',
  'Checks',
  'Last_Status',
  'Last_Run_Time',
  'Last_Duration_ms',
  'Last_Error',
  'Last_Run_ID'
];

const RUN_RAW_COLUMNS = [
  'Run_ID',
  'Timestamp',
  'TC_ID',
  'Spec_File',
  'Test_Title',
  'Status',
  'Duration_ms',
  'Error_Summary'
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readWorkbookIfExists(filePath) {
  if (!fs.existsSync(filePath)) return XLSX.utils.book_new();
  return XLSX.readFile(filePath);
}

function readSheetAsRows(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function writeSheetFromRows(workbook, sheetName, rows, columns) {
  const normalizedRows = rows.map((row) => {
    const out = {};
    for (const c of columns) out[c] = row[c] ?? '';
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(normalizedRows, { header: columns });
  if (workbook.SheetNames.includes(sheetName)) {
    workbook.Sheets[sheetName] = ws;
  } else {
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  }
}

function stripMdInline(value) {
  return String(value || '')
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .trim();
}

function normalizePathForCompare(value) {
  return String(value || '').replace(/\\/g, '/').trim();
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\[\]\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'the',
  'with',
  'after',
  'before',
  'from',
  'into',
  'that',
  'this',
  'only',
  'then',
  'and',
  'for',
  'are',
  'not',
  'all'
]);

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((t) => t && t.length > 2 && !STOPWORDS.has(t));
}

function tokenSimilarity(a, b) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function getMatrixMarker(value) {
  const match = String(value || '').match(/\[(\d+)\]/);
  return match ? `[${match[1]}]` : '';
}

function buildDashboardSheet(workbook, masterRows, runRows) {
  const passCount = masterRows.filter((r) => r.Last_Status === 'passed').length;
  const failCount = masterRows.filter((r) => r.Last_Status === 'failed').length;
  const skippedCount = masterRows.filter((r) => r.Last_Status === 'skipped').length;

  const latestRun = runRows.length
    ? runRows.reduce((acc, row) => {
        if (!acc || String(row.Timestamp) > String(acc.Timestamp)) return row;
        return acc;
      }, null)
    : null;

  const aoa = [
    ['Metric', 'Value'],
    ['Total Test Cases', masterRows.length],
    ['Latest Passed', passCount],
    ['Latest Failed', failCount],
    ['Latest Skipped', skippedCount],
    ['Latest Run ID', latestRun ? latestRun.Run_ID : ''],
    ['Latest Run Timestamp', latestRun ? latestRun.Timestamp : ''],
    ['Raw Run Rows', runRows.length]
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (workbook.SheetNames.includes('Dashboard')) {
    workbook.Sheets.Dashboard = ws;
  } else {
    XLSX.utils.book_append_sheet(workbook, ws, 'Dashboard');
  }
}

module.exports = {
  MASTER_XLSX_PATH,
  TESTCASES_DIR,
  REPORT_DIR,
  PLAYWRIGHT_JSON_PATH,
  MASTER_COLUMNS,
  RUN_RAW_COLUMNS,
  ensureDir,
  readWorkbookIfExists,
  readSheetAsRows,
  writeSheetFromRows,
  stripMdInline,
  normalizePathForCompare,
  normalizeText,
  tokenSimilarity,
  getMatrixMarker,
  buildDashboardSheet,
  XLSX,
  fs,
  path
};
