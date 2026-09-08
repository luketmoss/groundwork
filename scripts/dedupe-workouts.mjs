#!/usr/bin/env node
/**
 * dedupe-workouts.mjs — One-time cleanup for Workouts rows that share the
 * same workout id, plus any Sets rows orphaned by that corruption (a
 * workout_id with no matching Workouts row). See issue #95: a stale
 * sheetRow could cause a workout write to land on a different workout's
 * row, producing two rows with the same id.
 *
 * Reading the sheet always requires a real access token — there is no
 * anonymous read for a private spreadsheet — so --dry-run is a modifier on
 * a token-bearing run, not a token-free mode.
 *
 * Usage:
 *   node scripts/dedupe-workouts.mjs <ACCESS_TOKEN> --dry-run   # report only, no writes
 *   node scripts/dedupe-workouts.mjs <ACCESS_TOKEN>             # delete duplicates + orphans
 */

const SPREADSHEET_ID = '1YvFnJsY9KlKmbRZ4CrFc67pFwGgjUpHc_LgMVQm2zeQ';
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TOKEN = args.find((a) => a !== '--dry-run');

if (!TOKEN) {
  console.error('Usage: node scripts/dedupe-workouts.mjs <ACCESS_TOKEN> [--dry-run]');
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

async function getSheetId(sheetName) {
  const url = `${BASE}/${SPREADSHEET_ID}?fields=sheets.properties`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Fetch sheet metadata failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const sheet = data.sheets?.find((s) => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet tab "${sheetName}" not found`);
  return sheet.properties.sheetId;
}

async function deleteRow(sheetId, rowIndex) {
  const url = `${BASE}/${SPREADSHEET_ID}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    }),
  });
  if (!res.ok) throw new Error(`Delete row ${rowIndex} failed: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no changes will be made) ===\n' : '=== LIVE RUN ===\n');

  // 1. Fetch Workouts, group by id
  console.log('Fetching Workouts...');
  const workoutRows = await sheetsGet('Workouts!A2:K');
  const workouts = workoutRows.map((row, i) => ({
    id: row[0] || '',
    date: row[1] || '',
    time: row[2] || '',
    type: row[3] || '',
    name: row[4] || '',
    sheetRow: i + 2,
  }));
  console.log(`  Found ${workouts.length} workout rows.\n`);

  const byId = new Map();
  for (const w of workouts) {
    if (!w.id) continue;
    const arr = byId.get(w.id) || [];
    arr.push(w);
    byId.set(w.id, arr);
  }

  const duplicateGroups = [...byId.values()].filter((arr) => arr.length > 1);
  const workoutRowsToDelete = [];

  if (duplicateGroups.length === 0) {
    console.log('No duplicate workout ids found.\n');
  } else {
    console.log(`Found ${duplicateGroups.length} duplicate workout id(s):\n`);
    for (const group of duplicateGroups) {
      // Keep the earliest row (lowest sheetRow); the rows are content-identical
      // in the known corruption case, so which one survives doesn't lose data.
      const sorted = [...group].sort((a, b) => a.sheetRow - b.sheetRow);
      const [keep, ...remove] = sorted;
      console.log(`  id "${keep.id}":`);
      console.log(`    KEEP    row ${keep.sheetRow} — "${keep.name || keep.type}" (${keep.date})`);
      for (const r of remove) {
        console.log(`    DELETE  row ${r.sheetRow} — "${r.name || r.type}" (${r.date})`);
        workoutRowsToDelete.push(r.sheetRow);
      }
    }
    console.log('');
  }

  // 2. Fetch Sets, find rows whose workout_id has no matching Workouts row
  console.log('Fetching Sets...');
  const setRows = await sheetsGet('Sets!A2:K');
  const workoutIds = new Set(workouts.map((w) => w.id));
  const orphanSetRows = [];
  for (let i = 0; i < setRows.length; i++) {
    const workoutId = setRows[i][0];
    const sheetRow = i + 2;
    if (workoutId && !workoutIds.has(workoutId)) {
      orphanSetRows.push({ sheetRow, workoutId, exerciseName: setRows[i][2] || '' });
    }
  }
  console.log(`  Found ${setRows.length} set rows, ${orphanSetRows.length} orphaned.\n`);

  if (orphanSetRows.length > 0) {
    console.log('Orphaned Sets rows (workout_id has no matching Workouts row):');
    for (const s of orphanSetRows) {
      console.log(`    DELETE  Sets row ${s.sheetRow} — workout_id "${s.workoutId}" (${s.exerciseName})`);
    }
    console.log('');
  }

  console.log(`Summary: ${workoutRowsToDelete.length} duplicate Workouts row(s), ${orphanSetRows.length} orphaned Sets row(s).\n`);

  if (workoutRowsToDelete.length === 0 && orphanSetRows.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  if (DRY_RUN) {
    console.log('Dry run — no changes made. Re-run without --dry-run to apply.');
    return;
  }

  // 3. Delete orphaned Sets rows bottom-to-top (avoids row-shift during the loop)
  if (orphanSetRows.length > 0) {
    console.log('Deleting orphaned Sets rows...');
    const setsSheetId = await getSheetId('Sets');
    const sortedOrphans = [...orphanSetRows].sort((a, b) => b.sheetRow - a.sheetRow);
    for (const s of sortedOrphans) {
      await deleteRow(setsSheetId, s.sheetRow);
      console.log(`  Deleted Sets row ${s.sheetRow}`);
    }
  }

  // 4. Delete duplicate Workouts rows bottom-to-top
  if (workoutRowsToDelete.length > 0) {
    console.log('Deleting duplicate Workouts rows...');
    const workoutsSheetId = await getSheetId('Workouts');
    const sortedDeletes = [...workoutRowsToDelete].sort((a, b) => b - a);
    for (const row of sortedDeletes) {
      await deleteRow(workoutsSheetId, row);
      console.log(`  Deleted Workouts row ${row}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
