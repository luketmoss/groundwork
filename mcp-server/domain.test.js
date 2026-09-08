// Pure-function tests for the domain layer. No sheet access — run with:
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeDate, normalizeRangeToMax, groupTemplateRows, todayStr,
  slotKey, groupSetsByExercise, findSetSlots,
} from './domain.js';

test('normalizeDate passes ISO dates through', () => {
  assert.equal(normalizeDate('2026-03-14'), '2026-03-14');
});

test('normalizeDate understands relative keywords', () => {
  const d = new Date();
  assert.equal(normalizeDate('today'), todayStr(d));
  d.setDate(d.getDate() + 1);
  assert.equal(normalizeDate('tomorrow'), todayStr(d));
  d.setDate(d.getDate() + 2);
  assert.equal(normalizeDate('+3d'), todayStr(d));
});

test('normalizeDate returns empty for junk and empty input', () => {
  assert.equal(normalizeDate('next tuesday-ish'), '');
  assert.equal(normalizeDate(''), '');
  assert.equal(normalizeDate(undefined), '');
});

test('normalizeDate uses the local calendar day, not UTC', () => {
  // A late-evening local time must not roll forward the way toISOString would.
  const evening = new Date(2026, 2, 14, 23, 30);
  assert.equal(todayStr(evening), '2026-03-14');
});

test('normalizeRangeToMax collapses a range to its top end', () => {
  assert.equal(normalizeRangeToMax('8-10'), '10');
  assert.equal(normalizeRangeToMax('12'), '12');
  assert.equal(normalizeRangeToMax(' 6 - 8 '), '8');
});

test('normalizeRangeToMax leaves non-numeric values alone', () => {
  assert.equal(normalizeRangeToMax('AMRAP'), 'AMRAP');
  assert.equal(normalizeRangeToMax(''), '');
  assert.equal(normalizeRangeToMax(undefined), '');
});

test('groupTemplateRows groups by template and sorts exercises by order', () => {
  const rows = [
    { template_id: 't2', template_name: 'Pull', order: 2, exercise_name: 'Row' },
    { template_id: 't1', template_name: 'Push', order: 2, exercise_name: 'Fly' },
    { template_id: 't1', template_name: 'Push', order: 1, exercise_name: 'Bench' },
    { template_id: 't2', template_name: 'Pull', order: 1, exercise_name: 'Pullup' },
  ];
  const grouped = groupTemplateRows(rows);

  // Templates come back alphabetically by name.
  assert.deepEqual(grouped.map((t) => t.name), ['Pull', 'Push']);
  assert.deepEqual(grouped[0].exercises.map((e) => e.exercise_name), ['Pullup', 'Row']);
  assert.deepEqual(grouped[1].exercises.map((e) => e.exercise_name), ['Bench', 'Fly']);
});

// --- set slots ------------------------------------------------------
// The same exercise can appear in two sections of one workout (a warmup and a
// primary of the same lift). Those are separate slots with separate set
// numbering — matching on exercise_id alone made "primary set 1" resolve to
// the warmup row and overwrite it.

const slotSets = [
  { workout_id: 'w1', exercise_id: 'ex_ohp', exercise_name: 'OH Press', section: 'warmup', exercise_order: 1, set_number: 1 },
  { workout_id: 'w1', exercise_id: 'ex_ohp', exercise_name: 'OH Press', section: 'warmup', exercise_order: 1, set_number: 2 },
  { workout_id: 'w1', exercise_id: 'ex_ohp', exercise_name: 'OH Press', section: 'primary', exercise_order: 2, set_number: 1 },
  { workout_id: 'w1', exercise_id: 'ex_ohp', exercise_name: 'OH Press', section: 'primary', exercise_order: 2, set_number: 2 },
  { workout_id: 'w1', exercise_id: 'ex_ohp', exercise_name: 'OH Press', section: 'primary', exercise_order: 2, set_number: 3 },
  { workout_id: 'w2', exercise_id: 'ex_ohp', exercise_name: 'OH Press', section: 'primary', exercise_order: 1, set_number: 1 },
];

test('groupSetsByExercise keeps a warmup and a primary of the same lift apart', () => {
  const slots = groupSetsByExercise(slotSets.filter((s) => s.workout_id === 'w1'));
  assert.equal(slots.length, 2);
  assert.deepEqual(slots.map((g) => g.section), ['warmup', 'primary']);
  assert.deepEqual(slots.map((g) => g.sets.length), [2, 3]);
});

test('groupSetsByExercise orders slots by exercise_order and sets by set number', () => {
  const shuffled = [...slotSets.filter((s) => s.workout_id === 'w1')].reverse();
  const slots = groupSetsByExercise(shuffled);
  assert.deepEqual(slots.map((g) => g.exercise_order), [1, 2]);
  assert.deepEqual(slots[1].sets.map((s) => s.set_number), [1, 2, 3]);
});

test('findSetSlots returns every slot when nothing narrows it', () => {
  const slots = findSetSlots(slotSets, { workout_id: 'w1', exercise_id: 'ex_ohp' });
  assert.equal(slots.length, 2);
});

test('findSetSlots narrows by section', () => {
  const slots = findSetSlots(slotSets, { workout_id: 'w1', exercise_id: 'ex_ohp', section: 'primary' });
  assert.equal(slots.length, 1);
  assert.equal(slots[0].sets.length, 3);
  assert.equal(slots[0].sets[0].set_number, 1);
});

test('findSetSlots narrows by exercise_order', () => {
  const slots = findSetSlots(slotSets, { workout_id: 'w1', exercise_id: 'ex_ohp', exercise_order: 1 });
  assert.equal(slots.length, 1);
  assert.equal(slots[0].section, 'warmup');
});

test('findSetSlots stays inside the given workout', () => {
  const slots = findSetSlots(slotSets, { workout_id: 'w2', exercise_id: 'ex_ohp' });
  assert.equal(slots.length, 1);
  assert.equal(slots[0].sets.length, 1);
});

test('findSetSlots returns nothing for a section the exercise is not in', () => {
  assert.equal(
    findSetSlots(slotSets, { workout_id: 'w1', exercise_id: 'ex_ohp', section: 'cooldown' }).length,
    0,
  );
});

test('slotKey separates the same exercise in two positions', () => {
  assert.notEqual(slotKey(slotSets[0]), slotKey(slotSets[2]));
  assert.equal(slotKey(slotSets[2]), slotKey(slotSets[3]));
});
