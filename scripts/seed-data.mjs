#!/usr/bin/env node
/**
 * seed-data.mjs — Populate Google Sheet with exercises & templates from notebook.
 *
 * Usage:
 *   node scripts/seed-data.mjs <ACCESS_TOKEN>
 *   node scripts/seed-data.mjs --dry-run          # print data, no API calls
 */

const SPREADSHEET_ID = '1YvFnJsY9KlKmbRZ4CrFc67pFwGgjUpHc_LgMVQm2zeQ';
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const TODAY = '2026-03-14';

// ---------------------------------------------------------------------------
// Deterministic exercise IDs (hardcoded for idempotency)
// ---------------------------------------------------------------------------
const EX = {
  // Upper Push A
  bandPullAparts:       'ex_a0010001',
  pushUps:              'ex_a0010002',
  bbBenchPress:         'ex_a0010003', // also warmup "Bench Press (empty bar)"
  inclineDbPress:       'ex_a0010004',
  cableFly:             'ex_a0010005',
  dbLateralRaise:       'ex_a0010006',
  ropeTricepPushdown:   'ex_a0010007',
  abWheel:              'ex_a0010008',

  // Upper Pull A
  deadHang:             'ex_a0020001',
  bandRows:             'ex_a0020002',
  bbRow:                'ex_a0020003',
  chestSupportedRow:    'ex_a0020004',
  neutralGripCableRow:  'ex_a0020005',
  facePulls:            'ex_a0020006',
  dbHammerCurls:        'ex_a0020007',
  pallofPress:          'ex_a0020008',

  // Legs A
  bodyWeightSquats:     'ex_a0030001',
  hipOpeners:           'ex_a0030002',
  bbSquat:              'ex_a0030003',
  bulgarianSplitSquats: 'ex_a0030004',
  dbRomanianDL:         'ex_a0030005',
  standingCalfRaise:    'ex_a0030006',
  hangingKneeRaise:     'ex_a0030007',
  sidePlank:            'ex_a0030008',

  // Upper Push B
  shoulderCARs:         'ex_a0040001',
  lightDbOHPress:       'ex_a0040002', // warmup only — distinct from BB OH Press
  bbOHPress:            'ex_a0040003',
  dbArnoldPress:        'ex_a0040004',
  cableLateralRaise:    'ex_a0040005',
  closeGripPushUps:     'ex_a0040006',
  ohCableTricepExt:     'ex_a0040007',
  cableCrunch:          'ex_a0040008',

  // Upper Pull B
  scapPullups:          'ex_a0050001',
  lightCableRows:       'ex_a0050002',
  pullups:              'ex_a0050003',
  singleArmCableRow:    'ex_a0050004',
  dbPullovers:          'ex_a0050005',
  rearDeltFly:          'ex_a0050006',
  dbCurl:               'ex_a0050007',
  deadBugPullover:      'ex_a0050008',

  // Legs B
  gluteBridges:         'ex_a0060001',
  hamstringFlossing:    'ex_a0060002',
  rdl:                  'ex_a0060003',
  reverseLunge:         'ex_a0060004',
  kettlebellSwings:     'ex_a0060005',
  seatedCableHamCurl:   'ex_a0060006',
  // cableCrunch reused from Push B
  planks:               'ex_a0060007',
};

// ---------------------------------------------------------------------------
// Exercises (deduplicated)
// Columns: id, Name, Tags, Notes, Created
// ---------------------------------------------------------------------------
const exercises = [
  // Upper Push A
  [EX.bandPullAparts,       'Band Pull Aparts',         'Shoulders,Isolation',              '', TODAY],
  [EX.pushUps,              'Push Ups',                  'Push,Chest,Compound',              '', TODAY],
  [EX.bbBenchPress,         'BB Bench Press',            'Push,Chest,Compound',              '', TODAY],
  [EX.inclineDbPress,       'Incline DB Press',          'Push,Chest,Compound',              '', TODAY],
  [EX.cableFly,             'Cable Fly',                 'Push,Chest,Isolation',             '', TODAY],
  [EX.dbLateralRaise,       'DB Lateral Raise',          'Push,Shoulders,Isolation',         '', TODAY],
  [EX.ropeTricepPushdown,   'Rope Tricep Pushdown',      'Push,Arms,Isolation',              '', TODAY],
  [EX.abWheel,              'Ab Wheel',                  'Core,Isolation',                   '', TODAY],

  // Upper Pull A
  [EX.deadHang,             'Dead Hang',                 'Pull,Back',                        '', TODAY],
  [EX.bandRows,             'Band Rows',                 'Pull,Back,Isolation',              '', TODAY],
  [EX.bbRow,                'BB Row',                    'Pull,Back,Compound',               '', TODAY],
  [EX.chestSupportedRow,    'Chest Supported Row',       'Pull,Back,Compound',               '', TODAY],
  [EX.neutralGripCableRow,  'Neutral Grip Cable Row',    'Pull,Back,Compound',               '', TODAY],
  [EX.facePulls,            'Face Pulls',                'Pull,Shoulders,Isolation',         '', TODAY],
  [EX.dbHammerCurls,        'DB Hammer Curls',           'Pull,Arms,Isolation',              '', TODAY],
  [EX.pallofPress,          'Pallof Press',              'Core,Isolation',                   '', TODAY],

  // Legs A
  [EX.bodyWeightSquats,     'Body Weight Squats',        'Legs,Compound',                    '', TODAY],
  [EX.hipOpeners,           'Hip Openers',               'Legs',                             '', TODAY],
  [EX.bbSquat,              'BB Squat',                  'Legs,Compound',                    '', TODAY],
  [EX.bulgarianSplitSquats, 'Bulgarian Split Squats',    'Legs,Compound',                    '', TODAY],
  [EX.dbRomanianDL,         'DB Romanian DL',            'Legs,Compound',                    '', TODAY],
  [EX.standingCalfRaise,    'Standing Calf Raise',       'Legs,Isolation',                   '', TODAY],
  [EX.hangingKneeRaise,     'Hanging Knee Raise',        'Core,Isolation',                   '', TODAY],
  [EX.sidePlank,            'Side Plank',                'Core,Isolation',                   '', TODAY],

  // Upper Push B
  [EX.shoulderCARs,         'Shoulder CARs',             'Shoulders',                        '', TODAY],
  [EX.lightDbOHPress,       'Light DB OH Press',         'Push,Shoulders,Isolation',         '', TODAY],
  [EX.bbOHPress,            'BB OH Press',               'Push,Shoulders,Compound',          '', TODAY],
  [EX.dbArnoldPress,        'DB Arnold Press',           'Push,Shoulders,Compound',          '', TODAY],
  [EX.cableLateralRaise,    'Cable Lateral Raise',       'Push,Shoulders,Isolation',         '', TODAY],
  [EX.closeGripPushUps,     'Close Grip Push Ups',       'Push,Chest,Arms,Compound',         '', TODAY],
  [EX.ohCableTricepExt,     'OH Cable Tricep Extension', 'Push,Arms,Isolation',              '', TODAY],
  [EX.cableCrunch,          'Cable Crunch',              'Core,Isolation',                   '', TODAY],

  // Upper Pull B
  [EX.scapPullups,          'Scap Pullups',              'Pull,Back',                        '', TODAY],
  [EX.lightCableRows,       'Light Cable Rows',          'Pull,Back,Isolation',              '', TODAY],
  [EX.pullups,              'Pullups',                   'Pull,Back,Compound',               '', TODAY],
  [EX.singleArmCableRow,    'Single Arm Cable Row',      'Pull,Back,Compound',               '', TODAY],
  [EX.dbPullovers,          'DB Pullovers',              'Pull,Back,Isolation',              '', TODAY],
  [EX.rearDeltFly,          'Rear Delt Fly',             'Pull,Shoulders,Isolation',         '', TODAY],
  [EX.dbCurl,               'DB Curl',                   'Pull,Arms,Isolation',              '', TODAY],
  [EX.deadBugPullover,      'Dead Bug Pullover',         'Core,Isolation',                   '', TODAY],

  // Legs B
  [EX.gluteBridges,         'Glute Bridges',             'Legs,Isolation',                   '', TODAY],
  [EX.hamstringFlossing,    'Hamstring Flossing',        'Legs',                             '', TODAY],
  [EX.rdl,                  'RDL',                       'Legs,Compound',                    '', TODAY],
  [EX.reverseLunge,         'Reverse Lunge',             'Legs,Compound',                    '', TODAY],
  [EX.kettlebellSwings,     'Kettlebell Swings',         'Legs,Compound',                    '', TODAY],
  [EX.seatedCableHamCurl,   'Seated Cable Ham Curl',     'Legs,Isolation',                   '', TODAY],
  // cableCrunch already listed above
  [EX.planks,               'Planks',                    'Core,Isolation',                   '', TODAY],
];

// ---------------------------------------------------------------------------
// Template IDs (deterministic)
// ---------------------------------------------------------------------------
const TPL = {
  upperPushA: 'tpl_b0010001',
  upperPullA: 'tpl_b0020001',
  legsA:      'tpl_b0030001',
  upperPushB: 'tpl_b0040001',
  upperPullB: 'tpl_b0050001',
  legsB:      'tpl_b0060001',
};

// Helper: build a template row
// Columns: template_id, Template Name, Order, exercise_id, Exercise Name, Section, Sets, Reps, Rest (s), Group Rest (s), Created, Updated
function tplRow(tplId, name, order, exId, exName, section, sets, reps, rest, groupRest) {
  return [tplId, name, order, exId, exName, section, sets, reps, rest, groupRest, TODAY, TODAY];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
const templates = [
  // =========================================================================
  // WORKOUT 1 — Upper Push A
  // =========================================================================
  tplRow(TPL.upperPushA, 'Upper Push A', 1,  EX.bandPullAparts,     'Band Pull Aparts',     'warmup',  '1', '',      '',  ''),
  tplRow(TPL.upperPushA, 'Upper Push A', 2,  EX.pushUps,            'Push Ups',              'warmup',  '1', '',      '',  ''),
  tplRow(TPL.upperPushA, 'Upper Push A', 3,  EX.bbBenchPress,       'BB Bench Press',        'warmup',  '1', '',      '',  ''),
  tplRow(TPL.upperPushA, 'Upper Push A', 4,  EX.bbBenchPress,       'BB Bench Press',        'primary', '4-5', '4-6', '90-120', ''),
  tplRow(TPL.upperPushA, 'Upper Push A', 5,  EX.inclineDbPress,     'Incline DB Press',      'SS1',     '3', '10-12', '60', '60'),
  tplRow(TPL.upperPushA, 'Upper Push A', 6,  EX.cableFly,           'Cable Fly',             'SS1',     '3', '12-15', '60', '60'),
  tplRow(TPL.upperPushA, 'Upper Push A', 7,  EX.dbLateralRaise,     'DB Lateral Raise',      'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.upperPushA, 'Upper Push A', 8,  EX.ropeTricepPushdown, 'Rope Tricep Pushdown',  'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.upperPushA, 'Upper Push A', 9,  EX.abWheel,            'Ab Wheel',              'burnout', '2-3', '6-10', '',  ''),

  // =========================================================================
  // WORKOUT 2 — Upper Pull A
  // =========================================================================
  tplRow(TPL.upperPullA, 'Upper Pull A', 1,  EX.deadHang,            'Dead Hang',             'warmup',  '1', '30 sec', '', ''),
  tplRow(TPL.upperPullA, 'Upper Pull A', 2,  EX.bandRows,            'Band Rows',             'warmup',  '1', '',       '', ''),
  tplRow(TPL.upperPullA, 'Upper Pull A', 3,  EX.bbRow,               'BB Row',                'warmup',  '1', '',       '', ''),
  tplRow(TPL.upperPullA, 'Upper Pull A', 4,  EX.bbRow,               'BB Row',                'primary', '4-5', '4-6',  '90-120', ''),
  tplRow(TPL.upperPullA, 'Upper Pull A', 5,  EX.chestSupportedRow,   'Chest Supported Row',   'SS1',     '3', '10-12', '60', '60'),
  tplRow(TPL.upperPullA, 'Upper Pull A', 6,  EX.neutralGripCableRow, 'Neutral Grip Cable Row','SS1',     '3', '10-12', '60', '60'),
  tplRow(TPL.upperPullA, 'Upper Pull A', 7,  EX.facePulls,           'Face Pulls',            'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.upperPullA, 'Upper Pull A', 8,  EX.dbHammerCurls,       'DB Hammer Curls',       'SS2',     '3', '10-12', '60', '60'),
  tplRow(TPL.upperPullA, 'Upper Pull A', 9,  EX.pallofPress,         'Pallof Press',          'burnout', '2-3', '10-12', '', ''),

  // =========================================================================
  // WORKOUT 3 — Legs A
  // =========================================================================
  tplRow(TPL.legsA, 'Legs A', 1,  EX.bodyWeightSquats,     'Body Weight Squats',     'warmup',  '1', '',      '', ''),
  tplRow(TPL.legsA, 'Legs A', 2,  EX.hipOpeners,           'Hip Openers',            'warmup',  '1', '',      '', ''),
  tplRow(TPL.legsA, 'Legs A', 3,  EX.bbSquat,              'BB Squat',               'warmup',  '1', '',      '', ''),
  tplRow(TPL.legsA, 'Legs A', 4,  EX.bbSquat,              'BB Squat',               'primary', '4-5', '4-6', '120', ''),
  tplRow(TPL.legsA, 'Legs A', 5,  EX.bulgarianSplitSquats, 'Bulgarian Split Squats', 'SS1',     '3', '8-10',  '60', '60'),
  tplRow(TPL.legsA, 'Legs A', 6,  EX.dbRomanianDL,         'DB Romanian DL',         'SS1',     '3', '10-12', '60', '60'),
  tplRow(TPL.legsA, 'Legs A', 7,  EX.standingCalfRaise,    'Standing Calf Raise',    'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.legsA, 'Legs A', 8,  EX.hangingKneeRaise,     'Hanging Knee Raise',     'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.legsA, 'Legs A', 9,  EX.sidePlank,            'Side Plank',             'burnout', '2-3', '45 sec', '', ''),

  // =========================================================================
  // WORKOUT 4 — Upper Push B
  // =========================================================================
  tplRow(TPL.upperPushB, 'Upper Push B', 1,  EX.shoulderCARs,      'Shoulder CARs',           'warmup',  '1', '',      '', ''),
  tplRow(TPL.upperPushB, 'Upper Push B', 2,  EX.lightDbOHPress,    'Light DB OH Press',       'warmup',  '1', '',      '', ''),
  tplRow(TPL.upperPushB, 'Upper Push B', 3,  EX.bbOHPress,         'BB OH Press',             'primary', '4-5', '3-5', '90-120', ''),
  tplRow(TPL.upperPushB, 'Upper Push B', 4,  EX.dbArnoldPress,     'DB Arnold Press',         'SS1',     '3', '10-12', '60', '60'),
  tplRow(TPL.upperPushB, 'Upper Push B', 5,  EX.cableLateralRaise, 'Cable Lateral Raise',     'SS1',     '3', '12-15', '60', '60'),
  tplRow(TPL.upperPushB, 'Upper Push B', 6,  EX.closeGripPushUps,  'Close Grip Push Ups',     'SS2',     '3', '',      '60', '60'),
  tplRow(TPL.upperPushB, 'Upper Push B', 7,  EX.ohCableTricepExt,  'OH Cable Tricep Extension','SS2',    '3', '12-15', '60', '60'),
  tplRow(TPL.upperPushB, 'Upper Push B', 8,  EX.cableCrunch,       'Cable Crunch',            'burnout', '2-3', '10-15', '', ''),

  // =========================================================================
  // WORKOUT 5 — Upper Pull B
  // =========================================================================
  tplRow(TPL.upperPullB, 'Upper Pull B', 1,  EX.scapPullups,       'Scap Pullups',        'warmup',  '1', '',      '', ''),
  tplRow(TPL.upperPullB, 'Upper Pull B', 2,  EX.lightCableRows,    'Light Cable Rows',    'warmup',  '1', '',      '', ''),
  tplRow(TPL.upperPullB, 'Upper Pull B', 3,  EX.pullups,           'Pullups',             'primary', '4-5', '4-6', '90', ''),
  tplRow(TPL.upperPullB, 'Upper Pull B', 4,  EX.singleArmCableRow, 'Single Arm Cable Row','SS1',     '3', '10-12', '60', '60'),
  tplRow(TPL.upperPullB, 'Upper Pull B', 5,  EX.dbPullovers,       'DB Pullovers',        'SS1',     '3', '12-15', '60', '60'),
  tplRow(TPL.upperPullB, 'Upper Pull B', 6,  EX.rearDeltFly,       'Rear Delt Fly',       'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.upperPullB, 'Upper Pull B', 7,  EX.dbCurl,            'DB Curl',             'SS2',     '3', '10-12', '60', '60'),
  tplRow(TPL.upperPullB, 'Upper Pull B', 8,  EX.deadBugPullover,   'Dead Bug Pullover',   'burnout', '2-3', '8-10', '', ''),

  // =========================================================================
  // WORKOUT 6 — Legs B
  // =========================================================================
  tplRow(TPL.legsB, 'Legs B', 1,  EX.gluteBridges,        'Glute Bridges',         'warmup',  '1', '',      '', ''),
  tplRow(TPL.legsB, 'Legs B', 2,  EX.hamstringFlossing,   'Hamstring Flossing',    'warmup',  '1', '',      '', ''),
  tplRow(TPL.legsB, 'Legs B', 3,  EX.rdl,                 'RDL',                   'warmup',  '1', '',      '', ''),
  tplRow(TPL.legsB, 'Legs B', 4,  EX.rdl,                 'RDL',                   'primary', '4-5', '4-6', '120', ''),
  tplRow(TPL.legsB, 'Legs B', 5,  EX.reverseLunge,        'Reverse Lunge',         'SS1',     '3', '8',    '60', '60'),
  tplRow(TPL.legsB, 'Legs B', 6,  EX.kettlebellSwings,    'Kettlebell Swings',     'SS1',     '3', '15',   '60', '60'),
  tplRow(TPL.legsB, 'Legs B', 7,  EX.seatedCableHamCurl,  'Seated Cable Ham Curl', 'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.legsB, 'Legs B', 8,  EX.cableCrunch,         'Cable Crunch',          'SS2',     '3', '12-15', '60', '60'),
  tplRow(TPL.legsB, 'Legs B', 9,  EX.planks,              'Planks',                'burnout', '2', '45 sec', '', ''),
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function sheetsAppend(range, values, token) {
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const token = args.find(a => a !== '--dry-run');

  if (!dryRun && !token) {
    console.error('Usage: node seed-data.mjs <ACCESS_TOKEN>');
    console.error('       node seed-data.mjs --dry-run');
    process.exit(1);
  }

  console.log(`Exercises: ${exercises.length} rows`);
  console.log(`Templates: ${templates.length} rows`);
  console.log('');

  if (dryRun) {
    console.log('=== EXERCISES (Exercises!A:E) ===');
    console.log('id | Name | Tags | Notes | Created');
    console.log('-'.repeat(80));
    for (const row of exercises) {
      console.log(row.join(' | '));
    }
    console.log('');

    console.log('=== TEMPLATES (Templates!A:L) ===');
    console.log('template_id | Template Name | Order | exercise_id | Exercise Name | Section | Sets | Reps | Rest (s) | Group Rest (s) | Created | Updated');
    console.log('-'.repeat(120));
    for (const row of templates) {
      console.log(row.join(' | '));
    }
    console.log('');
    console.log('Dry run complete — no API calls made.');
    return;
  }

  // Append exercises
  console.log('Appending exercises to Exercises!A:E ...');
  await sheetsAppend('Exercises!A:E', exercises, token);
  console.log(`  ✓ ${exercises.length} exercises appended.`);

  // Append templates
  console.log('Appending templates to Templates!A:L ...');
  await sheetsAppend('Templates!A:L', templates, token);
  console.log(`  ✓ ${templates.length} template rows appended.`);

  console.log('');
  console.log('Seed complete!');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
