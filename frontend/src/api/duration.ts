/**
 * Duration unit boundary (#101).
 *
 * `Workouts!H` stores **elapsed seconds**. Everything the user sees or types is
 * **whole minutes**. These two functions are the only places that conversion
 * happens, so the unit can't drift the way `duration_min` holding seconds would
 * have.
 *
 * Empty is a first-class value throughout: a workout with no recorded duration
 * is not a workout of zero duration, and must never be counted as one.
 */

/**
 * Seconds (as stored) → whole minutes, or `null` when unset or non-numeric.
 * Callers must handle `null` by omitting the value, never by substituting 0.
 */
export function secondsToMinutes(elapsedSeconds: string): number | null {
  const seconds = parseInt(elapsedSeconds, 10);
  if (isNaN(seconds)) return null;
  return Math.round(seconds / 60);
}

/**
 * Whole minutes (as typed) → seconds for storage. Returns `''` for empty or
 * non-numeric input so an unset duration stays unset rather than becoming 0.
 */
export function minutesToSeconds(minutes: string): string {
  if (minutes.trim() === '') return '';
  const mins = parseInt(minutes, 10);
  if (isNaN(mins)) return '';
  return String(mins * 60);
}

/** `"62 min"`, or `''` when there is nothing to show. */
export function formatDuration(elapsedSeconds: string): string {
  const mins = secondsToMinutes(elapsedSeconds);
  return mins === null ? '' : `${mins} min`;
}
