/**
 * One-time (or repeatable) migration: reads legacy or module layout from the master workbook
 * and rewrites it with module tabs, endpoint grouping, blank separators, and styling.
 *
 * Input/output default: Master_TestCases.xlsx in repo root.
 * Override with MASTER_XLSX_INPUT / MASTER_XLSX_OUTPUT if needed.
 */
const fs = require('fs');
const { MASTER_XLSX_PATH } = require('./shared');
const {
  readMasterRowsFromFile,
  readRunRawRowsFromFile,
  readUnmappedRowsFromFile,
  writeMasterWorkbook
} = require('./master-workbook');

async function main() {
  const src = process.env.MASTER_XLSX_INPUT || MASTER_XLSX_PATH;
  const out = process.env.MASTER_XLSX_OUTPUT || MASTER_XLSX_PATH;

  if (!fs.existsSync(src)) {
    throw new Error(`Workbook not found: ${src}`);
  }

  const masterRows = await readMasterRowsFromFile(src);
  const runRows = await readRunRawRowsFromFile(src);
  const unmappedRows = await readUnmappedRowsFromFile(src);

  await writeMasterWorkbook(out, { masterRows, runRows, unmappedRows });

  console.log(`Restructured workbook written: ${out}`);
  console.log(`  Master rows: ${masterRows.length}`);
  console.log(`  Run_Results_Raw rows: ${runRows.length}`);
  console.log(`  Unmapped rows: ${unmappedRows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
