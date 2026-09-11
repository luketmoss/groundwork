import { describe, it, expect } from 'vitest';
import { setToRow } from './workouts-api';
import type { WorkoutSet } from './types';

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    workout_id: 'w_001',
    exercise_id: 'ex1',
    exercise_name: 'Bench Press',
    section: 'primary',
    exercise_order: 2,
    set_number: 3,
    planned_reps: '8',
    weight: '185',
    reps: '8',
    effort: 'Medium',
    ...overrides,
  };
}

// Issue #100 — the Sets tab is A:J; column K "Notes" was removed as dead.
describe('setToRow', () => {
  it('emits exactly ten cells, spanning A:J', () => {
    expect(setToRow(makeSet())).toHaveLength(10);
  });

  it('emits the columns in sheet order', () => {
    expect(setToRow(makeSet())).toEqual([
      'w_001', 'ex1', 'Bench Press', 'primary', 2, 3, '8', '185', '8', 'Medium',
    ]);
  });

  it('round-trips an unset effort as an empty cell rather than dropping it', () => {
    const row = setToRow(makeSet({ effort: '' }));
    expect(row).toHaveLength(10);
    expect(row[9]).toBe('');
  });

  // AC4: a queue entry serialized under the old shape still writes A:J.
  it('ignores a stale notes property left on an offline-queue payload', () => {
    const stale = { ...makeSet(), notes: 'written by a previous version' } as WorkoutSet;
    expect(setToRow(stale)).toEqual(setToRow(makeSet()));
  });
});
