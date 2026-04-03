#!/usr/bin/env node
/**
 * sync-exercise-names.mjs — One-time script to sync exercise names in Sets
 * tab with canonical names from Exercises tab, using exercise_id as the key.
 *
 * Usage:
 *   node scripts/sync-exercise-names.mjs <ACCESS_TOKEN>
 *   node scripts/sync-exercise-names.mjs --dry-run          # print changes, no API calls
 */

const SPREADSHEET_ID = '1YvFnJsY9KlKmbRZ4CrFc67pFwGgjUpHc_LgMVQm2zeQ';
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const TOKEN = process.argv[2];
const DRY_RUN = TOKEN === '--dry-run';

if (!TOKEN) {
  console.error('Usage: node scripts/sync-exercise-names.mjs <ACCESS_TOKEN|--dry-run>');
  process.exit(1);
}

async function sheetsGet(range) {
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`GET ${range} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.values || [];
}

async function sheetsBatchUpdate(data) {
  const url = `${BASE}/${SPREADSHEET_ID}/values:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data,
    }),
  });
  if (!res.ok) throw new Error(`batchUpdate failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN (no API calls) ===\n');
    console.log('In dry-run mode, cannot fetch data. Use a real token to see changes.');
    process.exit(0);
  }

  // 1. Fetch exercises — build id→name map
  console.log('Fetching Exercises...');
  const exerciseRows = await sheetsGet('Exercises!A2:E');
  const nameById = new Map();
  for (const row of exerciseRows) {
    const [id, name] = row;
    if (id && name) nameById.set(id, name);
  }
  console.log(`  Found ${nameById.size} exercises.\n`);

  // 2. Fetch sets — find mismatches
  // Sets columns: A=workout_id, B=exercise_id, C=Exercise Name, ...
  console.log('Fetching Sets...');
  const setRows = await sheetsGet('Sets!A2:K');
  console.log(`  Found ${setRows.length} set rows.\n`);

  const updates = []; // { range, values } for batchUpdate
  let mismatchCount = 0;
  let missingIdCount = 0;

  for (let i = 0; i < setRows.length; i++) {
    const row = setRows[i];
    const exerciseId = row[1];   // column B
    const currentName = row[2];  // column C
    const sheetRow = i + 2;      // +2 for header row + 0-index

    if (!exerciseId) continue;

    const canonicalName = nameById.get(exerciseId);
    if (!canonicalName) {
      missingIdCount++;
      console.log(`  ⚠ Row ${sheetRow}: exercise_id "${exerciseId}" not found in Exercises tab`);
      continue;
    }

    if (currentName !== canonicalName) {
      mismatchCount++;
      console.log(`  Row ${sheetRow}: "${currentName}" → "${canonicalName}" (${exerciseId})`);
      updates.push({
        range: `Sets!C${sheetRow}`,
        values: [[canonicalName]],
      });
    }
  }

  console.log(`\nSummary: ${mismatchCount} mismatches, ${missingIdCount} missing IDs, ${setRows.length - mismatchCount - missingIdCount} already correct.`);

  // 3. Apply updates
  if (updates.length === 0) {
    console.log('\nNothing to update. All names are in sync!');
    return;
  }

  console.log(`\nApplying ${updates.length} updates...`);
  const result = await sheetsBatchUpdate(updates);
  console.log(`Done. Updated ${result.totalUpdatedCells} cells.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
