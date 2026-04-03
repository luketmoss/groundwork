#!/usr/bin/env node
// One-time seed script: populates Exercises + Templates tabs in Google Sheets
// Usage: node frontend/scripts/seed.mjs <ACCESS_TOKEN>

const TOKEN = process.argv[2];
if (!TOKEN) { console.error('Usage: node seed.mjs <ACCESS_TOKEN>'); process.exit(1); }

const SHEET_ID = '1YvFnJsY9KlKmbRZ4CrFc67pFwGgjUpHc_LgMVQm2zeQ';
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function clearTab(tabName) {
  // Get current row count, then delete rows 2+
  const url = `${BASE}/values/${encodeURIComponent(tabName + '!A:A')}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Read ${tabName} failed: ${res.status}`);
  const data = await res.json();
  const rowCount = data.values?.length || 0;
  if (rowCount <= 1) { console.log(`✓ ${tabName}: already empty`); return; }

  // Clear data rows (keep header)
  const clearUrl = `${BASE}/values/${encodeURIComponent(tabName + '!A2:Z' + rowCount)}:clear`;
  const clearRes = await fetch(clearUrl, { method: 'POST', headers });
  if (!clearRes.ok) throw new Error(`Clear ${tabName} failed: ${clearRes.status}`);
  console.log(`✓ ${tabName}: cleared ${rowCount - 1} rows`);
}

async function append(range, values) {
  const url = `${BASE}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ values }) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Append ${range} failed: ${res.status} ${err}`);
  }
  console.log(`✓ ${range}: ${values.length} rows appended`);
}

// --- Exercises ---
// Columns: id, Name, Tags, Notes, Created
const now = new Date().toISOString();
let exId = 1;
function ex(name, tags, notes = '') {
  const id = `ex_${String(exId++).padStart(3, '0')}`;
  return { id, name, tags, row: [id, name, tags, notes, now] };
}

const exercises = {};
function getOrCreate(name, tags, notes) {
  if (!exercises[name]) exercises[name] = ex(name, tags, notes);
  return exercises[name];
}

// Equipment suffix naming: "Bench Press BB" not "BB Bench Press"
// Tags: muscle group + equipment + Warmup where applicable
// No Compound/Isolation tags

// Warmup exercises
getOrCreate('Band Pull Aparts', 'Warmup, Shoulders');
getOrCreate('Push Ups', 'Warmup, Push, Chest');
getOrCreate('Dead Hang', 'Warmup, Pull, Back');
getOrCreate('Band Rows', 'Warmup, Pull, Back');
getOrCreate('Body Weight Squats', 'Warmup, Legs');
getOrCreate('Hip Openers', 'Warmup, Legs');
getOrCreate('Shoulder CARs', 'Warmup, Shoulders');
getOrCreate('Scap Pullups', 'Warmup, Pull, Back');
getOrCreate('Light Cable Rows FT', 'Warmup, Pull, Back, FT');
getOrCreate('Glute Bridges', 'Warmup, Legs');
getOrCreate('Hamstring Flossing', 'Warmup, Legs');

// BB exercises
getOrCreate('Bench Press BB', 'Push, Chest, BB');
getOrCreate('Row BB', 'Pull, Back, BB');
getOrCreate('Squat BB', 'Legs, BB');
getOrCreate('OH Press BB', 'Push, Shoulders, BB');
getOrCreate('RDL BB', 'Legs, BB');

// DB exercises
getOrCreate('Incline Press DB', 'Push, Chest, DB');
getOrCreate('Lateral Raise DB', 'Push, Shoulders, DB');
getOrCreate('Hammer Curls DB', 'Pull, Arms, DB');
getOrCreate('Chest Supported Row DB', 'Pull, Back, DB');
getOrCreate('Bulgarian Split Squats DB', 'Legs, DB');
getOrCreate('Romanian DL DB', 'Legs, DB');
getOrCreate('Standing Calf Raise DB', 'Legs, DB');
getOrCreate('OH Press DB', 'Push, Shoulders, DB');
getOrCreate('Arnold Press DB', 'Push, Shoulders, DB');
getOrCreate('Pullovers DB', 'Pull, Back, DB');
getOrCreate('Rear Delt Fly DB', 'Pull, Shoulders, DB');
getOrCreate('Curl DB', 'Pull, Arms, DB');
getOrCreate('Dead Bug Pullover DB', 'Core, DB');
getOrCreate('Reverse Lunge DB', 'Legs, DB');

// FT (Functional Trainer) exercises
getOrCreate('Cable Fly FT', 'Push, Chest, FT');
getOrCreate('Rope Tricep Pushdown FT', 'Push, Arms, FT');
getOrCreate('Neutral Grip Row FT', 'Pull, Back, FT');
getOrCreate('Face Pulls FT', 'Pull, Shoulders, FT');
getOrCreate('Pallof Press FT', 'Core, FT');
getOrCreate('Lateral Raise FT', 'Push, Shoulders, FT');
getOrCreate('OH Tricep FT', 'Push, Arms, FT');
getOrCreate('Crunch FT', 'Core, FT');
getOrCreate('Single Arm Row FT', 'Pull, Back, FT');
getOrCreate('Seated Ham Curl FT', 'Legs, FT');

// KB exercises
getOrCreate('Kettlebell Swings KB', 'Legs, KB');

// Bodyweight / other (no equipment suffix)
getOrCreate('Ab Wheel', 'Core');
getOrCreate('Hanging Knee Raise', 'Core');
getOrCreate('Side Plank', 'Core');
getOrCreate('Close Grip Push Ups', 'Push, Chest, Arms');
getOrCreate('Pullups', 'Pull, Back');
getOrCreate('Planks', 'Core');

// --- Templates ---
// Columns: template_id, Template Name, Order, exercise_id, Exercise Name, Section, Sets, Reps, Rest (s), Group Rest (s), Created, Updated
let tplId = 1;
function tpl(name) {
  const id = `tpl_${String(tplId++).padStart(3, '0')}`;
  return { id, name, rows: [] };
}

function addExercise(template, order, exName, section, sets, reps, rest, groupRest) {
  const e = exercises[exName];
  if (!e) throw new Error(`Exercise not found: ${exName}`);
  template.rows.push([
    template.id, template.name, order, e.id, e.name,
    section, sets, reps, rest, groupRest, now, now
  ]);
}

// === Workout 1: Upper Push A ===
const t1 = tpl('Upper Push A');
addExercise(t1, 1, 'Band Pull Aparts', 'warmup', '1', '', '', '');
addExercise(t1, 2, 'Push Ups', 'warmup', '1', '', '', '');
addExercise(t1, 3, 'Bench Press BB', 'warmup', '1', '', '', '');
addExercise(t1, 4, 'Bench Press BB', 'primary', '4-5', '4-6', '90-120', '');
addExercise(t1, 5, 'Incline Press DB', 'SS1', '3', '10-12', '', '60');
addExercise(t1, 6, 'Cable Fly FT', 'SS1', '3', '12-15', '', '60');
addExercise(t1, 7, 'Lateral Raise DB', 'SS2', '3', '12-15', '', '60');
addExercise(t1, 8, 'Rope Tricep Pushdown FT', 'SS2', '3', '12-15', '', '60');
addExercise(t1, 9, 'Ab Wheel', 'burnout', '2-3', '6-10', '', '');

// === Workout 2: Upper Pull A ===
const t2 = tpl('Upper Pull A');
addExercise(t2, 1, 'Dead Hang', 'warmup', '1', '30 sec', '', '');
addExercise(t2, 2, 'Band Rows', 'warmup', '1', '', '', '');
addExercise(t2, 3, 'Row BB', 'warmup', '1', '', '', '');
addExercise(t2, 4, 'Row BB', 'primary', '4-5', '4-6', '90-120', '');
addExercise(t2, 5, 'Chest Supported Row DB', 'SS1', '3', '10-12', '', '60');
addExercise(t2, 6, 'Neutral Grip Row FT', 'SS1', '3', '10-12', '', '60');
addExercise(t2, 7, 'Face Pulls FT', 'SS2', '3', '12-15', '', '60');
addExercise(t2, 8, 'Hammer Curls DB', 'SS2', '3', '10-12', '', '60');
addExercise(t2, 9, 'Pallof Press FT', 'burnout', '2-3', '10-12', '', '');

// === Workout 3: Legs A ===
const t3 = tpl('Legs A');
addExercise(t3, 1, 'Body Weight Squats', 'warmup', '1', '', '', '');
addExercise(t3, 2, 'Hip Openers', 'warmup', '1', '', '', '');
addExercise(t3, 3, 'Squat BB', 'warmup', '1', '', '', '');
addExercise(t3, 4, 'Squat BB', 'primary', '4-5', '4-6', '120', '');
addExercise(t3, 5, 'Bulgarian Split Squats DB', 'SS1', '3', '8-10', '', '60');
addExercise(t3, 6, 'Romanian DL DB', 'SS1', '3', '10-12', '', '60');
addExercise(t3, 7, 'Standing Calf Raise DB', 'SS2', '3', '12-15', '', '60');
addExercise(t3, 8, 'Hanging Knee Raise', 'SS2', '3', '12-15', '', '60');
addExercise(t3, 9, 'Side Plank', 'burnout', '2-3', '45 sec', '', '');

// === Workout 4: Upper Push B ===
const t4 = tpl('Upper Push B');
addExercise(t4, 1, 'Shoulder CARs', 'warmup', '1', '', '', '');
addExercise(t4, 2, 'OH Press DB', 'warmup', '1', '', '', '');
addExercise(t4, 3, 'OH Press BB', 'primary', '4-5', '3-5', '90-120', '');
addExercise(t4, 4, 'Arnold Press DB', 'SS1', '3', '10-12', '', '60');
addExercise(t4, 5, 'Lateral Raise FT', 'SS1', '3', '12-15', '', '60');
addExercise(t4, 6, 'Close Grip Push Ups', 'SS2', '3', '', '', '60');
addExercise(t4, 7, 'OH Tricep FT', 'SS2', '3', '12-15', '', '60');
addExercise(t4, 8, 'Crunch FT', 'burnout', '2-3', '10-15', '', '');

// === Workout 5: Upper Pull B ===
const t5 = tpl('Upper Pull B');
addExercise(t5, 1, 'Scap Pullups', 'warmup', '1', '', '', '');
addExercise(t5, 2, 'Light Cable Rows FT', 'warmup', '1', '', '', '');
addExercise(t5, 3, 'Pullups', 'primary', '4-5', '4-6', '90', '');
addExercise(t5, 4, 'Single Arm Row FT', 'SS1', '3', '10-12', '', '60');
addExercise(t5, 5, 'Pullovers DB', 'SS1', '3', '12-15', '', '60');
addExercise(t5, 6, 'Rear Delt Fly DB', 'SS2', '3', '12-15', '', '60');
addExercise(t5, 7, 'Curl DB', 'SS2', '3', '10-12', '', '60');
addExercise(t5, 8, 'Dead Bug Pullover DB', 'burnout', '2-3', '8-10', '', '');

// === Workout 6: Legs B ===
const t6 = tpl('Legs B');
addExercise(t6, 1, 'Glute Bridges', 'warmup', '1', '', '', '');
addExercise(t6, 2, 'Hamstring Flossing', 'warmup', '1', '', '', '');
addExercise(t6, 3, 'RDL BB', 'warmup', '1', '', '', '');
addExercise(t6, 4, 'RDL BB', 'primary', '4-5', '4-6', '120', '');
addExercise(t6, 5, 'Reverse Lunge DB', 'SS1', '3', '8', '', '60');
addExercise(t6, 6, 'Kettlebell Swings KB', 'SS1', '3', '15', '', '60');
addExercise(t6, 7, 'Seated Ham Curl FT', 'SS2', '3', '12-15', '', '60');
addExercise(t6, 8, 'Crunch FT', 'SS2', '3', '12-15', '', '60');
addExercise(t6, 9, 'Planks', 'burnout', '2', '45 sec', '', '');

// --- Workout History ---
// Columns: id, Date, Time, Type, Name, template_id, Notes, Duration (min), Created, copied_from
let wkId = 1;
function workout(date, templateObj) {
  const id = `w_hist${String(wkId++).padStart(3, '0')}`;
  return {
    id,
    templateId: templateObj.id,
    row: [id, date, '07:00', 'weight', templateObj.name, templateObj.id, '', '60', now, ''],
    sets: [],
  };
}

// Sets columns: workout_id, exercise_id, Exercise Name, Section, Exercise Order, Set #, Planned Reps, Weight (lbs), Reps, Effort, Notes
// Helper: add sets for an exercise in a workout
function addSets(wk, exName, section, order, weight, repsArray, effort) {
  const e = exercises[exName];
  if (!e) throw new Error(`Exercise not found for sets: ${exName}`);
  // Find planned reps from template
  const tplRow = [t1, t2, t3, t4, t5, t6]
    .find(t => t.id === wk.templateId)
    ?.rows.find(r => r[3] === e.id && r[5] === section);
  const plannedReps = tplRow ? tplRow[7] : '';

  repsArray.forEach((reps, i) => {
    wk.sets.push([
      wk.id, e.id, e.name, section, order, i + 1,
      plannedReps, weight, reps, effort, ''
    ]);
  });
}

// === 3/4 — Workout 1: Upper Push A ===
const w1 = workout('2026-03-04', t1);
addSets(w1, 'Bench Press BB', 'primary', 4, 145, [5, 5, 5, 5, 5], 'Medium');
addSets(w1, 'Incline Press DB', 'SS1', 5, 40, [11, 11, 11], 'Hard');
addSets(w1, 'Cable Fly FT', 'SS1', 6, 3, [10, 10, 10], '');
addSets(w1, 'Lateral Raise DB', 'SS2', 7, 15, [12, 12, 12], 'Medium');
addSets(w1, 'Rope Tricep Pushdown FT', 'SS2', 8, 5, [12, 12, 12], '');
addSets(w1, 'Ab Wheel', 'burnout', 9, '', [10, 10], '');

// === 3/5 — Workout 2: Upper Pull A ===
const w2 = workout('2026-03-05', t2);
addSets(w2, 'Row BB', 'primary', 4, 160, [5, 5, 5, 5, 5], 'Medium');
addSets(w2, 'Chest Supported Row DB', 'SS1', 5, 25, [15, 15, 15], 'Hard');
addSets(w2, 'Neutral Grip Row FT', 'SS1', 6, 10, [15, 15, 15], '');
addSets(w2, 'Face Pulls FT', 'SS2', 7, 6, [12, 12, 12], 'Hard');
addSets(w2, 'Hammer Curls DB', 'SS2', 8, 30, [12, 12, 8], '');
addSets(w2, 'Pallof Press FT', 'burnout', 9, 3, [14, 14], '');

// === 3/7 — Workout 3: Legs A ===
const w3 = workout('2026-03-07', t3);
addSets(w3, 'Squat BB', 'primary', 4, 150, [6, 6, 6, 6, 6], 'Hard');
addSets(w3, 'Bulgarian Split Squats DB', 'SS1', 5, 15, [10, 10, 10], 'Hard');
addSets(w3, 'Romanian DL DB', 'SS1', 6, 45, [10, 10, 10], '');
addSets(w3, 'Standing Calf Raise DB', 'SS2', 7, 50, [12, 12, 12], '');
addSets(w3, 'Hanging Knee Raise', 'SS2', 8, '', [10, 10, 10], '');
addSets(w3, 'Side Plank', 'burnout', 9, '', [12, 12], '');

// === 3/9 — Workout 4: Upper Push B ===
const w4 = workout('2026-03-09', t4);
addSets(w4, 'OH Press BB', 'primary', 3, 100, [6, 6, 6, 5, 5], '');
addSets(w4, 'Arnold Press DB', 'SS1', 4, 30, [11, 11, 11], 'Hard');
addSets(w4, 'Lateral Raise FT', 'SS1', 5, 2, [10, 10, 10], '');
addSets(w4, 'Close Grip Push Ups', 'SS2', 6, '', [10, 10, 10], 'Hard');
addSets(w4, 'OH Tricep FT', 'SS2', 7, 4, [13, 13, 13], '');
addSets(w4, 'Crunch FT', 'burnout', 8, 11, [13, 13], '');

// === 3/10 — Workout 5: Upper Pull B ===
const w5 = workout('2026-03-10', t5);
addSets(w5, 'Pullups', 'primary', 3, '', [7, 7, 7, 7], 'Hard');
addSets(w5, 'Single Arm Row FT', 'SS1', 4, 6, [10, 10, 10], 'Hard');
addSets(w5, 'Pullovers DB', 'SS1', 5, 45, [10, 10, 10], '');
addSets(w5, 'Rear Delt Fly DB', 'SS2', 6, 10, [12, 12, 12], 'Hard');
addSets(w5, 'Curl DB', 'SS2', 7, 30, [10, 10, 10], '');
addSets(w5, 'Dead Bug Pullover DB', 'burnout', 8, 12, [12, 12], '');

// === 3/11 — Workout 6: Legs B ===
const w6 = workout('2026-03-11', t6);
addSets(w6, 'RDL BB', 'primary', 4, 165, [6, 6, 6, 6, 6], 'Hard');
addSets(w6, 'Reverse Lunge DB', 'SS1', 5, 30, [9, 9, 9], 'Hard');
addSets(w6, 'Kettlebell Swings KB', 'SS1', 6, 35, [15, 15, 15], '');
addSets(w6, 'Seated Ham Curl FT', 'SS2', 7, 3, [13, 13, 13], 'Hard');
addSets(w6, 'Crunch FT', 'SS2', 8, 11, [13, 13, 13], '');
addSets(w6, 'Planks', 'burnout', 9, 45, [45, 45], '');

const allWorkouts = [w1, w2, w3, w4, w5, w6];

// --- Execute ---
async function main() {
  console.log('Seeding Groundwork Google Sheet...\n');

  // 1. Clear existing data
  console.log('Clearing old data...');
  await clearTab('Exercises');
  await clearTab('Templates');
  await clearTab('Workouts');
  await clearTab('Sets');

  // 2. Append exercises
  const exerciseRows = Object.values(exercises).map(e => e.row);
  console.log(`\nExercises: ${exerciseRows.length} unique`);
  await append('Exercises!A2:E', exerciseRows);

  // 3. Append templates
  const allTemplates = [t1, t2, t3, t4, t5, t6];
  const templateRows = allTemplates.flatMap(t => t.rows);
  console.log(`Templates: ${allTemplates.length} templates, ${templateRows.length} rows`);
  await append('Templates!A2:L', templateRows);

  // 4. Append workouts
  const workoutRows = allWorkouts.map(w => w.row);
  console.log(`\nWorkouts: ${workoutRows.length}`);
  await append('Workouts!A2:J', workoutRows);

  // 5. Append sets
  const setRows = allWorkouts.flatMap(w => w.sets);
  console.log(`Sets: ${setRows.length} total`);
  await append('Sets!A2:K', setRows);

  console.log('\nDone! Check your Google Sheet.');
}

main().catch(err => { console.error(err.message); process.exit(1); });
