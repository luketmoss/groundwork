// Derives "last time" exercise data from the global store signals.
// No API calls — reads from already-loaded sets + workouts signals.

import { sets, workouts } from '../../state/store';
import type { SetWithRow, WorkoutWithRow } from '../../api/types';

export interface LastTimeResult {
  workoutDate: string;       // ISO date string e.g. "2025-01-14"
  sets: SetWithRow[];        // sorted by set_number
}

/**
 * Find the most recent workout's sets for a given exercise,
 * excluding the current workout.
 */
export function getLastTimeData(
  exerciseId: string,
  currentWorkoutId: string,
): LastTimeResult | null {
  return getLastTimeDataFrom(exerciseId, currentWorkoutId, sets.value, workouts.value);
}

/** Pure function for testing — accepts data directly instead of reading signals. */
export function getLastTimeDataFrom(
  exerciseId: string,
  currentWorkoutId: string,
  allSets: SetWithRow[],
  allWorkouts: WorkoutWithRow[],
): LastTimeResult | null {
  // Build a date lookup for workouts
  const workoutDateMap = new Map<string, string>();
  for (const w of allWorkouts) {
    workoutDateMap.set(w.id, w.date);
  }

  // Filter sets for this exercise, excluding current workout
  const matchingSets = allSets.filter(
    (s) => s.exercise_id === exerciseId && s.workout_id !== currentWorkoutId,
  );

  if (matchingSets.length === 0) return null;

  // Group by workout_id, find the one with the most recent date
  const byWorkout = new Map<string, SetWithRow[]>();
  for (const s of matchingSets) {
    const arr = byWorkout.get(s.workout_id) || [];
    arr.push(s);
    byWorkout.set(s.workout_id, arr);
  }

  let bestWorkoutId = '';
  let bestDate = '';

  for (const workoutId of byWorkout.keys()) {
    const date = workoutDateMap.get(workoutId) || '';
    if (date > bestDate) {
      bestDate = date;
      bestWorkoutId = workoutId;
    }
  }

  if (!bestWorkoutId) return null;

  const resultSets = byWorkout.get(bestWorkoutId)!;
  resultSets.sort((a, b) => a.set_number - b.set_number);

  return {
    workoutDate: bestDate,
    sets: resultSets,
  };
}

/** Format a date string as "Mar 10, 2026 (5 days ago)". */
export function formatLastTimeDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  // Reset time to midnight for accurate day diff
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let relative: string;
  if (diffDays === 0) relative = 'today';
  else if (diffDays === 1) relative = 'yesterday';
  else relative = `${diffDays} days ago`;

  return `${formatted} (${relative})`;
}
