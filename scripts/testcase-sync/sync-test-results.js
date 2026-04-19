const crypto = require('crypto');
const {
  MASTER_XLSX_PATH,
  REPORT_DIR,
  PLAYWRIGHT_JSON_PATH,
  MASTER_COLUMNS,
  RUN_RAW_COLUMNS,
  ensureDir,
  readWorkbookIfExists,
  readSheetAsRows,
  writeSheetFromRows,
  normalizePathForCompare,
  normalizeText,
  tokenSimilarity,
  getMatrixMarker,
  buildDashboardSheet,
  XLSX,
  fs,
  path
} = require('./shared');

function collectSpecEntries(node, entries = []) {
  if (!node || typeof node !== 'object') return entries;

  if (Array.isArray(node.specs)) {
    for (const spec of node.specs) {
      entries.push({
        file: normalizePathForCompare(spec.file || node.file || ''),
        spec
      });
    }
  }
  if (Array.isArray(node.suites)) {
    for (const child of node.suites) collectSpecEntries(child, entries);
  }
  return entries;
}

function flattenPlaywrightResults(jsonReport) {
  const suites = Array.isArray(jsonReport.suites) ? jsonReport.suites : [];
  const specEntries = [];
  for (const s of suites) collectSpecEntries(s, specEntries);

  const rows = [];
  for (const entry of specEntries) {
    const spec = entry.spec || {};
    const tests = Array.isArray(spec.tests) ? spec.tests : [];
    for (const test of tests) {
      const results = Array.isArray(test.results) ? test.results : [];
      const lastResult = results.length ? results[results.length - 1] : {};
      const status = String(lastResult.status || test.status || test.outcome || 'unknown').toLowerCase();
      const duration = Number.isFinite(lastResult.duration) ? Number(lastResult.duration) : 0;
      const errMsg =
        (lastResult.error && (lastResult.error.message || lastResult.error.value)) ||
        (Array.isArray(lastResult.errors) && lastResult.errors[0] && lastResult.errors[0].message) ||
        '';
      rows.push({
        specFile: entry.file,
        testTitle: String(spec.title || test.title || '').trim(),
        status,
        durationMs: duration,
        errorSummary: String(errMsg || '').slice(0, 1000)
      });
    }
  }
  return rows;
}

function inferTcId(resultRow, candidates) {
  const titleNorm = normalizeText(resultRow.testTitle);
  if (candidates.length === 1) {
    return { tcId: candidates[0].TC_ID, confidence: 0.8, reason: 'Single_candidate_by_spec_file' };
  }

  for (const c of candidates) {
    if (titleNorm.includes(normalizeText(c.TC_ID))) {
      return { tcId: c.TC_ID, confidence: 1, reason: 'TC_ID_in_title' };
    }
  }

  let best = null;
  let second = null;
  for (const c of candidates) {
    let score = tokenSimilarity(c.Scenario, resultRow.testTitle);
    const marker = getMatrixMarker(c.Scenario);
    if (marker && titleNorm.includes(normalizeText(marker))) score += 0.25;

    if (!best || score > best.score) {
      second = best;
      best = { tcId: c.TC_ID, score, scenario: c.Scenario };
    } else if (!second || score > second.score) {
      second = { tcId: c.TC_ID, score, scenario: c.Scenario };
    }
  }

  if (!best) return { tcId: '', confidence: 0, reason: 'No_candidates' };
  if (best.score < 0.35) return { tcId: '', confidence: best.score, reason: 'Low_similarity' };
  if (second && Math.abs(best.score - second.score) < 0.1) {
    return { tcId: '', confidence: best.score, reason: 'Ambiguous_match' };
  }
  return { tcId: best.tcId, confidence: best.score, reason: 'Scenario_similarity' };
}

function main() {
  ensureDir(REPORT_DIR);

  if (!fs.existsSync(MASTER_XLSX_PATH)) {
    throw new Error(
      `Master workbook not found at ${MASTER_XLSX_PATH}. Run generate-master-testcases first.`
    );
  }
  if (!fs.existsSync(PLAYWRIGHT_JSON_PATH)) {
    throw new Error(
      `Playwright JSON report not found at ${PLAYWRIGHT_JSON_PATH}. Run tests with JSON reporter enabled.`
    );
  }

  const workbook = readWorkbookIfExists(MASTER_XLSX_PATH);
  const masterRows = readSheetAsRows(workbook, 'TestCases_Master');
  const priorRunRows = readSheetAsRows(workbook, 'Run_Results_Raw');

  const reportJson = JSON.parse(fs.readFileSync(PLAYWRIGHT_JSON_PATH, 'utf-8'));
  const flatResults = flattenPlaywrightResults(reportJson);
  const runId = process.env.RUN_ID || process.env.BUILD_ID || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const bySpecFile = new Map();
  for (const row of masterRows) {
    const key = normalizePathForCompare(row.Spec_File);
    if (!bySpecFile.has(key)) bySpecFile.set(key, []);
    bySpecFile.get(key).push(row);
  }

  const runRows = [];
  const unmapped = [];

  for (const result of flatResults) {
    let candidates = bySpecFile.get(result.specFile) || [];
    if (!candidates.length) {
      candidates = masterRows.filter((r) => {
        const m = normalizePathForCompare(r.Spec_File);
        return m.endsWith(result.specFile) || result.specFile.endsWith(m);
      });
    }
    const guessed = inferTcId(result, candidates);
    const mapped = guessed.tcId && masterRows.some((r) => String(r.TC_ID) === String(guessed.tcId));
    const tcId = mapped ? guessed.tcId : '';

    if (!tcId) {
      unmapped.push({
        runId,
        timestamp,
        specFile: result.specFile,
        testTitle: result.testTitle,
        status: result.status,
        reason: guessed.reason,
        confidence: guessed.confidence
      });
    }

    runRows.push({
      Run_ID: runId,
      Timestamp: timestamp,
      TC_ID: tcId,
      Spec_File: result.specFile,
      Test_Title: result.testTitle,
      Status: result.status,
      Duration_ms: result.durationMs,
      Error_Summary: result.errorSummary
    });
  }

  const mergedRunRows = [...priorRunRows];
  const seen = new Set(
    priorRunRows.map((r) => `${r.Run_ID}::${r.TC_ID}::${r.Spec_File}::${r.Test_Title}`)
  );
  for (const row of runRows) {
    const key = `${row.Run_ID}::${row.TC_ID}::${row.Spec_File}::${row.Test_Title}`;
    if (!seen.has(key)) {
      seen.add(key);
      mergedRunRows.push(row);
    }
  }

  const latestByTc = new Map();
  for (const row of mergedRunRows) {
    if (!row.TC_ID) continue;
    const curr = latestByTc.get(row.TC_ID);
    if (!curr || String(row.Timestamp) >= String(curr.Timestamp)) {
      latestByTc.set(row.TC_ID, row);
    }
  }

  const updatedMasterRows = masterRows.map((row) => {
    const latest = latestByTc.get(String(row.TC_ID));
    if (!latest) return row;
    return {
      ...row,
      Last_Status: latest.Status || '',
      Last_Run_Time: latest.Timestamp || '',
      Last_Duration_ms: latest.Duration_ms || '',
      Last_Error: latest.Error_Summary || '',
      Last_Run_ID: latest.Run_ID || ''
    };
  });

  writeSheetFromRows(workbook, 'TestCases_Master', updatedMasterRows, MASTER_COLUMNS);
  writeSheetFromRows(workbook, 'Run_Results_Raw', mergedRunRows, RUN_RAW_COLUMNS);
  buildDashboardSheet(workbook, updatedMasterRows, mergedRunRows);

  const unmappedSheetRows = unmapped.map((u) => ({
    Run_ID: u.runId,
    Timestamp: u.timestamp,
    Spec_File: u.specFile,
    Test_Title: u.testTitle,
    Status: u.status,
    Reason: u.reason,
    Confidence: u.confidence
  }));
  const unmappedSheet = XLSX.utils.json_to_sheet(unmappedSheetRows, {
    header: ['Run_ID', 'Timestamp', 'Spec_File', 'Test_Title', 'Status', 'Reason', 'Confidence']
  });
  if (workbook.SheetNames.includes('Unmapped_Results')) {
    workbook.Sheets.Unmapped_Results = unmappedSheet;
  } else {
    XLSX.utils.book_append_sheet(workbook, unmappedSheet, 'Unmapped_Results');
  }

  XLSX.writeFile(workbook, MASTER_XLSX_PATH);

  const unmappedPath = path.join(REPORT_DIR, 'unmapped-results.json');
  fs.writeFileSync(
    unmappedPath,
    JSON.stringify(
      {
        runId,
        timestamp,
        totalResults: flatResults.length,
        unmappedCount: unmapped.length,
        unmapped
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`Master workbook synced: ${MASTER_XLSX_PATH}`);
  console.log(`Run rows added: ${runRows.length}`);
  console.log(`Unmapped results: ${unmapped.length} (${unmappedPath})`);
}

main();
