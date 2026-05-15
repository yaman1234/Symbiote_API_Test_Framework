const {
  MASTER_XLSX_PATH,
  TESTCASES_DIR,
  REPORT_DIR,
  ensureDir,
  stripMdInline,
  normalizePathForCompare,
  fs,
  path
} = require('./shared');
const { readMasterRowsFromFile, readRunRawRowsFromFile, writeMasterWorkbook } = require('./master-workbook');
const { TESTCASE_MD_ORDER } = require('./testcase-order');

function cleanDescribeTitle(value) {
  return String(value || '')
    .replace(/\s*@\w+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackEndpointNameFromPath(specPath) {
  const base = path.basename(String(specPath || ''), '.spec.js');
  return base.replace(/[._-]+/g, ' ').trim();
}

function buildEndpointNameCache() {
  const cache = new Map();
  const root = path.resolve(process.cwd(), 'tests', 'api');
  if (!fs.existsSync(root)) return cache;

  function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !fullPath.endsWith('.spec.js')) continue;
      const relPath = normalizePathForCompare(path.relative(process.cwd(), fullPath));
      const content = fs.readFileSync(fullPath, 'utf-8');
      const describeMatch = content.match(/test\.describe\(\s*['"`]([^'"`]+)['"`]/);
      const endpointName = cleanDescribeTitle(
        describeMatch ? describeMatch[1] : fallbackEndpointNameFromPath(relPath)
      );
      cache.set(relPath, endpointName);
    }
  }

  walk(root);
  return cache;
}

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

function parseTestCaseFile(filePath, endpointNameCache) {
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
    const endpointName =
      endpointNameCache.get(normalizePathForCompare(row.Spec_File)) ||
      fallbackEndpointNameFromPath(row.Spec_File);
    rows.push({
      TC_ID: row.TC_ID,
      Method: method,
      EndPoint: endpoint,
      Endpoint_Name: endpointName,
      Suite: row.Suite,
      Scenario: row.Scenario,
      Expected: row.Expected,
      Checks: row.Checks,
      'Last Status': '',
      'Last Run Time': '',
      'Last API Response Time': '',
      'Last Error': '',
      Spec_File: row.Spec_File
    });

    if (warning) warnings.push(warning);
  }

  return { rows, warnings };
}

async function main() {
  ensureDir(REPORT_DIR);
  const endpointNameCache = buildEndpointNameCache();

  const onDisk = fs
    .readdirSync(TESTCASES_DIR)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');
  const orderedNames = [...TESTCASE_MD_ORDER];
  for (const name of onDisk) {
    if (!orderedNames.includes(name)) orderedNames.push(name);
  }

  const rows = [];
  const warnings = [];
  for (const base of orderedNames) {
    const filePath = path.join(TESTCASES_DIR, base);
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseTestCaseFile(filePath, endpointNameCache);
    rows.push(...parsed.rows);
    warnings.push(...parsed.warnings);
  }

  const dedupedByTc = new Map();
  const tcOrder = [];
  for (const row of rows) {
    if (!row.TC_ID) continue;
    const id = String(row.TC_ID);
    if (!dedupedByTc.has(id)) {
      dedupedByTc.set(id, row);
      tcOrder.push(id);
    } else {
      warnings.push({
        file: 'multiple',
        tcHint: id,
        missingFields: ['Duplicate TC_ID found; keeping first occurrence (document order)']
      });
    }
  }

  let existingMasterRows = [];
  let existingRunRawRows = [];
  if (fs.existsSync(MASTER_XLSX_PATH)) {
    existingMasterRows = await readMasterRowsFromFile(MASTER_XLSX_PATH);
    existingRunRawRows = await readRunRawRowsFromFile(MASTER_XLSX_PATH);
  }
  const existingByTc = new Map(existingMasterRows.map((r) => [String(r.TC_ID), r]));

  const mergedRows = tcOrder.map((id) => {
    const row = dedupedByTc.get(id);
    const existing = existingByTc.get(id);
    if (!existing) return row;
    return {
      ...row,
      Endpoint_Name: row.Endpoint_Name || existing.Endpoint_Name || '',
      'Last Status': existing['Last Status'] || existing.Last_Status || '',
      'Last Run Time': existing['Last Run Time'] || existing.Last_Run_Time || '',
      'Last API Response Time':
        existing['Last API Response Time'] || existing.Last_Duration_ms || '',
      'Last Error': existing['Last Error'] || existing.Last_Error || ''
    };
  });

  const outputPath = process.env.MASTER_XLSX_OUTPUT || MASTER_XLSX_PATH;
  await writeMasterWorkbook(outputPath, {
    masterRows: mergedRows,
    runRows: existingRunRawRows,
    unmappedRows: []
  });

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

  console.log(`Master workbook updated: ${outputPath}`);
  console.log(`Test cases parsed: ${mergedRows.length}`);
  console.log(`Parse warnings: ${warnings.length} (${warningPath})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
