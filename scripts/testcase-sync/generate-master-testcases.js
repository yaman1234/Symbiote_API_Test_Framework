const {
  MASTER_XLSX_PATH,
  TESTCASES_DIR,
  REPORT_DIR,
  MASTER_COLUMNS,
  RUN_RAW_COLUMNS,
  ensureDir,
  readWorkbookIfExists,
  readSheetAsRows,
  writeSheetFromRows,
  stripMdInline,
  normalizePathForCompare,
  buildDashboardSheet,
  XLSX,
  fs,
  path
} = require('./shared');

function extractEndpointInfo(markdown) {
  const firstHeader = markdown.match(/^#\s+`([^`]+)`/m);
  const endpointLabel = firstHeader ? firstHeader[1].trim() : '';
  if (!endpointLabel) return { api: '', method: '', endpoint: '' };

  const parts = endpointLabel.split(/\s+/);
  const method = (parts[0] || '').toUpperCase();
  const endpoint = parts.slice(1).join(' ').trim();
  return {
    api: endpointLabel,
    method,
    endpoint
  };
}

function parseBlock(blockText, context) {
  const lines = blockText.split(/\r?\n/);
  const row = {
    TC_ID: '',
    Suite: '',
    Spec_File: '',
    Scenario: '',
    Expected: '',
    Checks: ''
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('- **')) continue;

    if (line.includes('**TC_ID:**')) row.TC_ID = stripMdInline(line.split('**TC_ID:**')[1]);
    if (line.includes('**Suite:**')) row.Suite = stripMdInline(line.split('**Suite:**')[1]);
    if (line.includes('**Spec_File:**')) {
      row.Spec_File = normalizePathForCompare(stripMdInline(line.split('**Spec_File:**')[1]));
    }
    if (line.includes('**Scenario:**')) row.Scenario = stripMdInline(line.split('**Scenario:**')[1]);
    if (line.includes('**Expected:**')) row.Expected = stripMdInline(line.split('**Expected:**')[1]);
  }

  const checksLineIndex = lines.findIndex((l) => l.includes('**Checks:**'));
  if (checksLineIndex >= 0) {
    const bullets = [];
    const firstChecksLine = lines[checksLineIndex];
    const inlineChecks = firstChecksLine.split('**Checks:**')[1];
    if (inlineChecks && inlineChecks.trim()) bullets.push(stripMdInline(inlineChecks));

    for (let i = checksLineIndex + 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith('## ')) break;
      if (line.startsWith('---')) break;
      if (line.startsWith('- **')) break;
      if (line.startsWith('- ')) {
        bullets.push(stripMdInline(line.slice(2)));
      } else if (line.startsWith('* ')) {
        bullets.push(stripMdInline(line.slice(2)));
      }
    }
    row.Checks = bullets.join(' | ');
  }

  const missingFields = [];
  for (const field of ['TC_ID', 'Suite', 'Spec_File', 'Scenario', 'Expected', 'Checks']) {
    if (!String(row[field] || '').trim()) missingFields.push(field);
  }

  return {
    row,
    warning: missingFields.length
      ? {
          file: context.file,
          tcHint: context.blockTitle,
          missingFields
        }
      : null
  };
}

function parseTestCaseFile(filePath) {
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const { api, method, endpoint } = extractEndpointInfo(markdown);
  const warnings = [];
  const rows = [];

  const sections = markdown.split(/\r?\n##\s+/);
  for (let i = 1; i < sections.length; i += 1) {
    const section = sections[i];
    const newlineIdx = section.indexOf('\n');
    const blockTitle = String(newlineIdx >= 0 ? section.slice(0, newlineIdx) : section)
      .trim()
      .replace(/#/g, '');
    const blockBody = newlineIdx >= 0 ? section.slice(newlineIdx + 1) : '';
    if (!/^[A-Z0-9-]+$/.test(blockTitle)) continue;

    const { row, warning } = parseBlock(blockBody, {
      file: path.basename(filePath),
      blockTitle
    });

    if (!row.TC_ID) row.TC_ID = blockTitle;
    rows.push({
      TC_ID: row.TC_ID,
      API: api,
      Method: method,
      Endpoint: endpoint,
      Suite: row.Suite,
      Spec_File: row.Spec_File,
      Scenario: row.Scenario,
      Expected: row.Expected,
      Checks: row.Checks,
      Last_Status: '',
      Last_Run_Time: '',
      Last_Duration_ms: '',
      Last_Error: '',
      Last_Run_ID: ''
    });

    if (warning) warnings.push(warning);
  }

  return { rows, warnings };
}

function main() {
  ensureDir(REPORT_DIR);
  const testCaseFiles = fs
    .readdirSync(TESTCASES_DIR)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .map((f) => path.join(TESTCASES_DIR, f));

  const rows = [];
  const warnings = [];
  for (const filePath of testCaseFiles) {
    const parsed = parseTestCaseFile(filePath);
    rows.push(...parsed.rows);
    warnings.push(...parsed.warnings);
  }

  const dedupedByTc = new Map();
  for (const row of rows) {
    if (!row.TC_ID) continue;
    if (!dedupedByTc.has(row.TC_ID)) {
      dedupedByTc.set(row.TC_ID, row);
    } else {
      warnings.push({
        file: 'multiple',
        tcHint: row.TC_ID,
        missingFields: ['Duplicate TC_ID found; keeping first occurrence']
      });
    }
  }

  const workbook = readWorkbookIfExists(MASTER_XLSX_PATH);
  const existingMasterRows = readSheetAsRows(workbook, 'TestCases_Master');
  const existingByTc = new Map(existingMasterRows.map((r) => [String(r.TC_ID), r]));

  const mergedRows = Array.from(dedupedByTc.values())
    .map((row) => {
      const existing = existingByTc.get(String(row.TC_ID));
      if (!existing) return row;
      return {
        ...row,
        Last_Status: existing.Last_Status || '',
        Last_Run_Time: existing.Last_Run_Time || '',
        Last_Duration_ms: existing.Last_Duration_ms || '',
        Last_Error: existing.Last_Error || '',
        Last_Run_ID: existing.Last_Run_ID || ''
      };
    })
    .sort((a, b) => String(a.TC_ID).localeCompare(String(b.TC_ID)));

  const existingRunRawRows = readSheetAsRows(workbook, 'Run_Results_Raw');

  writeSheetFromRows(workbook, 'TestCases_Master', mergedRows, MASTER_COLUMNS);
  writeSheetFromRows(workbook, 'Run_Results_Raw', existingRunRawRows, RUN_RAW_COLUMNS);
  buildDashboardSheet(workbook, mergedRows, existingRunRawRows);

  XLSX.writeFile(workbook, MASTER_XLSX_PATH);

  const warningPath = path.join(REPORT_DIR, 'parse-warnings.json');
  fs.writeFileSync(
    warningPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        warningCount: warnings.length,
        warnings
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`Master workbook updated: ${MASTER_XLSX_PATH}`);
  console.log(`Test cases parsed: ${mergedRows.length}`);
  console.log(`Parse warnings: ${warnings.length} (${warningPath})`);
}

main();
