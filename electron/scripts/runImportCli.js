#!/usr/bin/env node
const path = require('path');
const importExcel = require('./importExcel');

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node runImportCli.js <filePath>');
    process.exit(1);
  }

  try {
    const absPath = path.resolve(filePath);
    const res = await importExcel(absPath);
    console.log('Import finished:', JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();
