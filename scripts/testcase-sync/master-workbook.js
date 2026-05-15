const ExcelJS = require('exceljs');
const { MASTER_COLUMNS, RUN_RAW_COLUMNS, normalizePathForCompare } = require('./shared');

const SYSTEM_SHEETS = new Set(['Dashboard', 'Run_Results_Raw', 'Unmapped_Results']);
const LEGACY_MASTER_SHEET = 'TestCases_Master';

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4472C4' }
};
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const ZEBRA_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' }
};
const PASS_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFC6EFCE' }
};
const FAIL_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFC7CE' }
};
const SKIP_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFEB9C' }
};

function capitalize(word) {
  const w = String(word || '').trim();
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * Maps spec path to a workbook module tab (Auth, Tasks, Users, …).
 */
function getModuleSheetName(specPath) {
  const norm = normalizePathForCompare(specPath);
  const m = norm.match(/\/modules\/([^/]+)\//i);
  if (m) return capitalize(m[1]);
  if (/\/regression\//i.test(norm)) return 'Regression';
  if (/\/modules\/template\//i.test(norm)) return 'Template';
  return 'Other';
}

function endpointGroupKey(row) {
  const method = String(row.Method || '').trim();
  const ep = String(row.EndPoint || '').trim();
  if (method || ep) return `${method} ${ep}`.trim();
  const name = String(row.Endpoint_Name || '').trim();
  return name || 'Unknown';
}

/**
 * Keeps endpoint groups in **first-seen order** (document order from generator),
 * then one blank row (`null`) after each endpoint’s test rows.
 */
function organizeRowsWithEndpointGaps(rows) {
  const orderedKeys = [];
  const byEp = new Map();
  for (const row of rows) {
    const k = endpointGroupKey(row);
    if (!byEp.has(k)) {
      byEp.set(k, []);
      orderedKeys.push(k);
    }
    byEp.get(k).push(row);
  }
  const out = [];
  for (const k of orderedKeys) {
    const list = byEp
      .get(k)
      .slice()
      .sort((a, b) => String(a.TC_ID).localeCompare(String(b.TC_ID), undefined, { numeric: true }));
    out.push(...list);
    out.push(null);
  }
  if (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

function getCellText(cell) {
  if (!cell || cell.value == null || cell.value === '') return '';
  const v = cell.value;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && Array.isArray(v.richText)) {
    return v.richText.map((t) => t.text).join('');
  }
  if (typeof v === 'object' && v.text !== undefined) return String(v.text);
  if (typeof v === 'object' && v.result !== undefined) return String(v.result);
  return String(v);
}

function readFixedColumnsSheet(worksheet, columns) {
  if (!worksheet) return [];
  const out = [];
  const maxRow = worksheet.rowCount || 0;
  for (let r = 2; r <= maxRow; r += 1) {
    const row = worksheet.getRow(r);
    const first = getCellText(row.getCell(1));
    if (!String(first || '').trim()) continue;
    const obj = {};
    for (let c = 0; c < columns.length; c += 1) {
      obj[columns[c]] = getCellText(row.getCell(c + 1));
    }
    out.push(obj);
  }
  return out;
}

function listDataSheetNames(workbook) {
  return workbook.worksheets.map((w) => w.name).filter((n) => !SYSTEM_SHEETS.has(n));
}

/**
 * Reads master testcase rows from module tabs, or legacy TestCases_Master.
 */
async function readMasterRowsFromFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const dataSheets = listDataSheetNames(workbook);
  const onlyLegacy =
    dataSheets.length === 1 && dataSheets[0] === LEGACY_MASTER_SHEET;
  const namesToRead = onlyLegacy
    ? [LEGACY_MASTER_SHEET]
    : dataSheets.filter((n) => n !== LEGACY_MASTER_SHEET);

  const combined = [];
  for (const name of namesToRead) {
    const ws = workbook.getWorksheet(name);
    const rows = readFixedColumnsSheet(ws, MASTER_COLUMNS);
    combined.push(...rows);
  }
  return combined;
}

async function readRunRawRowsFromFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.getWorksheet('Run_Results_Raw');
  if (!ws) return [];
  return readFixedColumnsSheet(ws, RUN_RAW_COLUMNS);
}

const UNMAPPED_COLUMNS = ['Run_ID', 'Timestamp', 'Spec_File', 'Test_Title', 'Status', 'Reason', 'Confidence'];

async function readUnmappedRowsFromFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.getWorksheet('Unmapped_Results');
  if (!ws) return [];
  return readFixedColumnsSheet(ws, UNMAPPED_COLUMNS);
}

function applyStatusCellFill(cell, statusRaw) {
  const s = String(statusRaw || '').trim().toLowerCase();
  if (s === 'passed') cell.fill = PASS_FILL;
  else if (s === 'failed') cell.fill = FAIL_FILL;
  else if (s === 'skipped' || s === 'timedout') cell.fill = SKIP_FILL;
}

function writeMasterSheet(worksheet, rowsWithGaps) {
  const headerRow = worksheet.getRow(1);
  headerRow.height = 20;
  MASTER_COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', wrapText: true };
  });

  const statusColIndex = MASTER_COLUMNS.indexOf('Last Status') + 1;
  let excelRow = 2;
  let dataIndex = 0;

  for (const item of rowsWithGaps) {
    if (item === null) {
      const blank = worksheet.getRow(excelRow);
      blank.height = 6;
      excelRow += 1;
      continue;
    }

    const row = worksheet.getRow(excelRow);
    const isZebra = dataIndex % 2 === 1;
    dataIndex += 1;

    MASTER_COLUMNS.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = item[col] ?? '';
      cell.alignment = { vertical: 'top', wrapText: true };
      const c = idx + 1;
      if (c === statusColIndex) {
        applyStatusCellFill(cell, item['Last Status']);
      } else if (isZebra) {
        cell.fill = ZEBRA_FILL;
      }
    });
    excelRow += 1;
  }

  MASTER_COLUMNS.forEach((colName, idx) => {
    worksheet.getColumn(idx + 1).width = Math.min(52, Math.max(12, colName.length + 4));
  });
}

function writePlainDataSheet(worksheet, columns, rows, headerStyle = true) {
  const headerRow = worksheet.getRow(1);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col;
    if (headerStyle) {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
    }
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  let r = 2;
  for (const item of rows) {
    const row = worksheet.getRow(r);
    columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = item[col] ?? '';
      cell.alignment = { vertical: 'top', wrapText: true };
    });
    r += 1;
  }
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = Math.min(52, Math.max(10, col.length + 2));
  });
}

function buildDashboardRows(masterRows, runRows) {
  const passCount = masterRows.filter((r) => String(r['Last Status'] || '').toLowerCase() === 'passed').length;
  const failCount = masterRows.filter((r) => String(r['Last Status'] || '').toLowerCase() === 'failed').length;
  const skippedCount = masterRows.filter((r) => {
    const s = String(r['Last Status'] || '').toLowerCase();
    return s === 'skipped' || s === 'timedout';
  }).length;

  const latestRun = runRows.length
    ? runRows.reduce((acc, row) => {
        if (!acc || String(row.Timestamp) > String(acc.Timestamp)) return row;
        return acc;
      }, null)
    : null;

  return [
    ['Metric', 'Value'],
    ['Total Test Cases', masterRows.length],
    ['Latest Passed', passCount],
    ['Latest Failed', failCount],
    ['Latest Skipped', skippedCount],
    ['Latest Run ID', latestRun ? latestRun.Run_ID : ''],
    ['Latest Run Timestamp', latestRun ? latestRun.Timestamp : ''],
    ['Raw Run Rows', runRows.length]
  ];
}

function writeDashboardSheet(worksheet, aoa) {
  aoa.forEach((line, i) => {
    const row = worksheet.getRow(i + 1);
    line.forEach((val, j) => {
      const cell = row.getCell(j + 1);
      cell.value = val;
      if (i === 0) {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
      } else if (j === 0) {
        cell.fill = ZEBRA_FILL;
      }
    });
  });
  worksheet.getColumn(1).width = 28;
  worksheet.getColumn(2).width = 40;
}

/**
 * Writes the full master workbook: module sheets (grouped by endpoint), Dashboard, Run_Results_Raw, Unmapped_Results.
 */
async function writeMasterWorkbook(filePath, { masterRows, runRows, unmappedRows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'API_Testing_Framework';
  workbook.created = new Date();

  const dash = workbook.addWorksheet('Dashboard', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  writeDashboardSheet(dash, buildDashboardRows(masterRows, runRows));

  const byModule = new Map();
  for (const row of masterRows) {
    const mod = getModuleSheetName(row.Spec_File);
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod).push(row);
  }

  const moduleOrder = [...byModule.keys()].sort((a, b) => a.localeCompare(b));
  for (const mod of moduleOrder) {
    const ws = workbook.addWorksheet(mod, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    const organized = organizeRowsWithEndpointGaps(byModule.get(mod));
    writeMasterSheet(ws, organized);
  }

  const runWs = workbook.addWorksheet('Run_Results_Raw', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  writePlainDataSheet(runWs, RUN_RAW_COLUMNS, runRows, true);

  const unmapped = unmappedRows || [];
  const unWs = workbook.addWorksheet('Unmapped_Results', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  writePlainDataSheet(unWs, UNMAPPED_COLUMNS, unmapped, true);

  await workbook.xlsx.writeFile(filePath);
}

module.exports = {
  getModuleSheetName,
  endpointGroupKey,
  organizeRowsWithEndpointGaps,
  readMasterRowsFromFile,
  readRunRawRowsFromFile,
  readUnmappedRowsFromFile,
  writeMasterWorkbook,
  LEGACY_MASTER_SHEET,
  SYSTEM_SHEETS,
  UNMAPPED_COLUMNS
};
