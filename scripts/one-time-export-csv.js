#!/usr/bin/env node
/**
 * One-time backup: reads budgeting-app data from the iOS Simulator (Expo Go)
 * and writes CSV files to ./backup/
 *
 * Usage: node scripts/one-time-export-csv.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const STORAGE_KEYS = {
  transactions: '@budgeting_app_transactions',
  budgets: '@budgeting_app_budgets',
  subscriptions: '@budgeting_app_subscriptions',
};

function findStorageDir() {
  const home = process.env.HOME;
  const base = path.join(
    home,
    'Library/Developer/CoreSimulator/Devices'
  );
  if (!fs.existsSync(base)) {
    throw new Error('iOS Simulator data not found. Are you on a Mac with the simulator?');
  }

  const matches = execSync(
    `find "${base}" -path "*ExponentExperienceData*budgeting-app*RCTAsyncLocalStorage" -type d 2>/dev/null`,
    { encoding: 'utf8' }
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  if (matches.length === 0) {
    throw new Error(
      'Could not find budgeting-app data in the simulator. Open the app in Expo Go at least once, then retry.'
    );
  }

  // Prefer the most recently modified project folder
  matches.sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
  );
  return matches[0];
}

function readAsyncStorageValue(storageDir, key) {
  const manifestPath = path.join(storageDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const raw = manifest[key];

  if (typeof raw === 'string' && raw.length > 0) {
    if (raw.startsWith('[') || raw.startsWith('{')) {
      return raw;
    }
    const filePath = path.join(storageDir, raw);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  }

  // Large values are sometimes stored in an md5(key) file with manifest entry null
  const hash = crypto.createHash('md5').update(key).digest('hex');
  const hashPath = path.join(storageDir, hash);
  if (fs.existsSync(hashPath)) {
    return fs.readFileSync(hashPath, 'utf8');
  }

  return null;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsv(row[col])).join(',')
  );
  return [header, ...lines].join('\n') + '\n';
}

function main() {
  const storageDir = findStorageDir();
  console.log(`Reading data from:\n  ${storageDir}\n`);

  const backupDir = path.join(process.cwd(), 'backup');
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);

  // Transactions
  const txRaw = readAsyncStorageValue(storageDir, STORAGE_KEYS.transactions);
  const transactions = txRaw ? JSON.parse(txRaw) : [];
  const txCsv = rowsToCsv(transactions, [
    'type',
    'amount',
    'category',
    'date',
    'place',
    'description',
    'id',
  ]);
  const txPath = path.join(backupDir, `transactions-${stamp}.csv`);
  fs.writeFileSync(txPath, txCsv);
  console.log(`  ${transactions.length} transactions -> ${txPath}`);

  // Budgets
  const budgetRaw = readAsyncStorageValue(storageDir, STORAGE_KEYS.budgets);
  const budgets = budgetRaw ? JSON.parse(budgetRaw) : [];
  const budgetCsv = rowsToCsv(budgets, [
    'category',
    'amount',
    'period',
    'periodKey',
    'isRecurring',
    'id',
  ]);
  const budgetPath = path.join(backupDir, `budgets-${stamp}.csv`);
  fs.writeFileSync(budgetPath, budgetCsv);
  console.log(`  ${budgets.length} budgets -> ${budgetPath}`);

  // Subscriptions
  const subRaw = readAsyncStorageValue(storageDir, STORAGE_KEYS.subscriptions);
  const subscriptions = subRaw ? JSON.parse(subRaw) : [];
  const subCsv = rowsToCsv(subscriptions, [
    'name',
    'amount',
    'category',
    'frequency',
    'id',
  ]);
  const subPath = path.join(backupDir, `subscriptions-${stamp}.csv`);
  fs.writeFileSync(subPath, subCsv);
  console.log(`  ${subscriptions.length} subscriptions -> ${subPath}`);

  // Full JSON backup too (handy if CSV loses optional fields)
  const jsonPath = path.join(backupDir, `full-backup-${stamp}.json`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ transactions, budgets, subscriptions }, null, 2)
  );
  console.log(`  Full JSON backup -> ${jsonPath}`);

  console.log('\nDone. To start fresh in the simulator:');
  console.log('  Device > Erase All Content and Settings (in Simulator menu)');
  console.log('  or delete the Expo Go app and reinstall it.');
}

main();
