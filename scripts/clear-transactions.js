#!/usr/bin/env node
/**
 * Clears all transactions and resets subscription paid status in the iOS Simulator.
 *
 * Usage: node scripts/clear-transactions.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const STORAGE_KEYS = {
  transactions: '@budgeting_app_transactions',
  subscriptions: '@budgeting_app_subscriptions',
};

function findStorageDir() {
  const home = process.env.HOME;
  const base = path.join(home, 'Library/Developer/CoreSimulator/Devices');
  if (!fs.existsSync(base)) {
    throw new Error('iOS Simulator data not found.');
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
      'Could not find budgeting-app data in the simulator. Open the app in Expo Go first.'
    );
  }

  matches.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
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

  const hash = crypto.createHash('md5').update(key).digest('hex');
  const hashPath = path.join(storageDir, hash);
  if (fs.existsSync(hashPath)) {
    return fs.readFileSync(hashPath, 'utf8');
  }

  return null;
}

function writeAsyncStorageValue(storageDir, key, value) {
  const manifestPath = path.join(storageDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const hash = crypto.createHash('md5').update(key).digest('hex');
  const hashPath = path.join(storageDir, hash);

  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  if (serialized.length < 1024) {
    manifest[key] = serialized;
    if (fs.existsSync(hashPath)) {
      fs.unlinkSync(hashPath);
    }
  } else {
    manifest[key] = null;
    fs.writeFileSync(hashPath, serialized);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}

function main() {
  const storageDir = findStorageDir();
  console.log(`Clearing data in:\n  ${storageDir}\n`);

  const txRaw = readAsyncStorageValue(storageDir, STORAGE_KEYS.transactions);
  const transactions = txRaw ? JSON.parse(txRaw) : [];
  console.log(`  Clearing ${transactions.length} transactions`);

  writeAsyncStorageValue(storageDir, STORAGE_KEYS.transactions, []);

  const subRaw = readAsyncStorageValue(storageDir, STORAGE_KEYS.subscriptions);
  const subscriptions = subRaw ? JSON.parse(subRaw) : [];
  const resetSubs = subscriptions.map(({ lastPaidPeriodKey, ...rest }) => rest);
  console.log(`  Resetting paid status on ${subscriptions.length} subscriptions`);

  writeAsyncStorageValue(storageDir, STORAGE_KEYS.subscriptions, resetSubs);

  console.log('\nDone. Reload the app in Expo Go to see the changes.');
}

main();
