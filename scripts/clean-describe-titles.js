const fs = require('fs');
const path = require('path');

function walkSpecs(dirPath, out = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkSpecs(fullPath, out);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.spec.js')) out.push(fullPath);
  }
  return out;
}

function cleanDescribeTitle(title) {
  return String(title || '')
    .replace(/\s*@\w+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const files = walkSpecs(path.resolve(process.cwd(), 'tests', 'api'));
let changedFiles = 0;
let changedTitles = 0;

for (const filePath of files) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const updated = source.replace(
    /test\.describe\(\s*(['"`])([^'"`]+)\1/g,
    (match, quote, title) => {
      const cleaned = cleanDescribeTitle(title);
      if (cleaned !== title) changedTitles += 1;
      return `test.describe(${quote}${cleaned}${quote}`;
    }
  );
  if (updated !== source) {
    fs.writeFileSync(filePath, updated, 'utf-8');
    changedFiles += 1;
  }
}

console.log(JSON.stringify({ scanned: files.length, changedFiles, changedTitles }, null, 2));
