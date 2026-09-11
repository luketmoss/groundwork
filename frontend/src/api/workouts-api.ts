// Workouts + Sets domain API — wraps Sheets REST calls with demo-mode fallback.

import type { Workout, WorkoutWithRow, WorkoutSet, SetWithRow, WorkoutType } from './types';
import { sheetsGet, sheetsAppend, sheetsUpdate, sheetsDeleteRow, getSheetId, withReauth } from './sheets';
import { isDemo, DEMO_WORKOUTS, DEMO_SETS } from './demo-data';
import { toLocalDateStr } from '../components/activities/activities-helpers';

/**
 * Thrown when a workout write targets a sheetRow that no longer holds that
 * workout's id — the cached row index went stale (e.g. a row shift from a
 * delete elsewhere in the same session). Writing anyway would silently
 * clobber a different workout's row (see issue #95).
 */
export class WorkoutRowMismatchError extends Error {
  constructor(public workoutId: string) {
    super(`Workout row for id "${workoutId}" could not be verified — it may be out of sync`);
    this.name = 'WorkoutRowMismatchError';
  }
}

// ── Workouts tab (A:K) ──────────────────────────────────────────────

export async function fetchWorkouts(token: string): Promise<WorkoutWithRow[]> {
  if (isDemo()) return [...DEMO_WORKOUTS];

  return withReauth(token, async (t) => {
    const rows = await sheetsGet('Workouts!A2:K', t);
    return rows.map((row, i) => ({
      id: row[0] || '',
      date: row[1] || '',
      time: row[2] || '',
      type: (row[3] || 'weight') as WorkoutType,
      name: row[4] || '',
      template_id: row[5] || '',
      notes: row[6] || '',
      duration_min: row[7] || '',
      created: row[8] || '',
      copied_from: row[9] || '',
      status: row[10] || '',
      sheetRow: i + 2,
    }));
  });
}

/**
 * Look up a single workout's current sheetRow by id. Used right after
 * creating a workout so callers don't have to guess `workouts.value.length + 2`
 * — that guess is only correct while the local list exactly mirrors the
 * sheet, which a prior delete in the same session can silently break (see
 * issue #95).
 */
export async function findWorkoutRow(workoutId: string, token: string): Promise<WorkoutWithRow | null> {
  const all = await fetchWorkouts(token);
  return all.find((w) => w.id === workoutId) ?? null;
}

export async function createWorkout(
  data: { type: WorkoutType; name: string; template_id?: string; notes?: string; duration_min?: string; copied_from?: string; date?: string; status?: string },
  token: string,
): Promise<Workout> {
  const id = `w_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date();
  const date = data.date || toLocalDateStr(now);
  const time = now.toTimeString().slice(0, 5);
  const created = now.toISOString();

  const workout: Workout = {
    id,
    date,
    time,
    type: data.type,
    name: data.name,
    template_id: data.template_id || '',
    notes: data.notes || '',
    duration_min: data.duration_min || '',
    created,
    copied_from: data.copied_from || '',
    status: data.status || '',
  };

  if (!isDemo()) {
    await withReauth(token, (t) =>
      sheetsAppend('Workouts!A:K', [[
        workout.id,
        workout.date,
        workout.time,
        workout.type,
        workout.name,
        workout.template_id,
        workout.notes,
        workout.duration_min,
        workout.created,
        workout.copied_from,
        workout.status,
      ]], t),
    );
  }

  return workout;
}

export async function updateWorkout(
  sheetRow: number,
  workout: Workout,
  token: string,
): Promise<void> {
  if (isDemo()) return;

  await withReauth(token, async (t) => {
    // Verify the row still belongs to this workout before overwriting it —
    // a stale sheetRow (e.g. after a delete shifted rows) would otherwise
    // silently clobber a different workout's data (see issue #95).
    const idCell = await sheetsGet(`Workouts!A${sheetRow}:A${sheetRow}`, t);
    const rowId = idCell[0]?.[0];
    if (rowId !== workout.id) {
      throw new WorkoutRowMismatchError(workout.id);
    }

    await sheetsUpdate(`Workouts!A${sheetRow}:K${sheetRow}`, [[
      workout.id,
      workout.date,
      workout.time,
      workout.type,
      workout.name,
      workout.template_id,
      workout.notes,
      workout.duration_min,
      workout.created,
      workout.copied_from,
      workout.status,
    ]], t);
  });
}

export async function deleteWorkoutRows(
  workout: WorkoutWithRow,
  workoutSets: SetWithRow[],
  token: string,
): Promise<void> {
  if (isDemo()) return;

  await withReauth(token, async (t) => {
    // Delete sets bottom-to-top to avoid row shift
    const setsToDelete = workoutSets
      .filter((s) => s.workout_id === workout.id)
      .sort((a, b) => b.sheetRow - a.sheetRow);

    if (setsToDelete.length > 0) {
      const setsSheetId = await getSheetId('Sets', t);
      for (const s of setsToDelete) {
        await sheetsDeleteRow(setsSheetId, s.sheetRow, t);
      }
    }

    // Delete the workout row
    const workoutsSheetId = await getSheetId('Workouts', t);
    await sheetsDeleteRow(workoutsSheetId, workout.sheetRow, t);
  });
}

// ── Sets tab (A:K) ──────────────────────────────────────────────────

export async function fetchSets(token: string): Promise<SetWithRow[]> {
  if (isDemo()) return [...DEMO_SETS];

  return withReauth(token, async (t) => {
    const rows = await sheetsGet('Sets!A2:J', t);
    return rows.map((row, i) => ({
      workout_id: row[0] || '',
      exercise_id: row[1] || '',
      exercise_name: row[2] || '',
      section: row[3] || '',
      exercise_order: Number(row[4]) || 0,
      set_number: Number(row[5]) || 0,
      planned_reps: row[6] || '',
      weight: row[7] || '',
      reps: row[8] || '',
      effort: (row[9] || '') as SetWithRow['effort'],
      sheetRow: i + 2,
    }));
  });
}

/**
 * Builds a `Sets!A:J` row. Reads named fields, so a payload carrying extra
 * properties — an offline-queue entry serialized under the old shape, say —
 * contributes no stray trailing cell.
 */
export function setToRow(s: WorkoutSet): (string | number)[] {
  return [
    s.workout_id,
    s.exercise_id,
    s.exercise_name,
    s.section,
    s.exercise_order,
    s.set_number,
    s.planned_reps,
    s.weight,
    s.reps,
    s.effort,
  ];
}

export async function appendSet(set: WorkoutSet, token: string): Promise<void> {
  if (isDemo()) return;

  await withReauth(token, (t) =>
    sheetsAppend('Sets!A:J', [setToRow(set)], t),
  );
}

export async function appendSets(sets: WorkoutSet[], token: string): Promise<void> {
  if (isDemo()) return;
  if (sets.length === 0) return;

  await withReauth(token, (t) =>
    sheetsAppend('Sets!A:J', sets.map(setToRow), t),
  );
}

export async function updateSet(
  sheetRow: number,
  set: WorkoutSet,
  token: string,
): Promise<void> {
  if (isDemo()) return;

  await withReauth(token, (t) =>
    sheetsUpdate(`Sets!A${sheetRow}:J${sheetRow}`, [setToRow(set)], t),
  );
}

export async function updateExerciseNameInSets(
  exerciseId: string,
  newName: string,
  allSets: SetWithRow[],
  token: string,
): Promise<void> {
  const affected = allSets.filter(s => s.exercise_id === exerciseId);
  if (affected.length === 0) return;

  if (isDemo()) return;

  await withReauth(token, async (t) => {
    for (const s of affected) {
      await sheetsUpdate(
        `Sets!C${s.sheetRow}`,
        [[newName]],
        t,
      );
    }
  });
}

export async function deleteSetRow(sheetRow: number, token: string): Promise<void> {
  if (isDemo()) return;

  await withReauth(token, async (t) => {
    const sheetId = await getSheetId('Sets', t);
    await sheetsDeleteRow(sheetId, sheetRow, t);
  });
}
