import type { TrackerExercise } from './exercise-row';

/** Returns true if the exercise is a warmup (list-only, no set tracking). */
export function isWarmupExercise(exercise: TrackerExercise): boolean {
  return exercise.section === 'warmup';
}
