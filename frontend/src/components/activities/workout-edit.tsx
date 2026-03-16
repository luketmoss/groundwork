import { useEffect } from 'preact/hooks';
import { workouts, sets, isEditMode } from '../../state/store';
import { enterEditMode, exitEditMode } from '../../state/actions';
import { navigate } from '../../router/router';
import { WorkoutTracker } from '../workout/workout-tracker';
import { EditWorkoutForm } from './edit-workout-form';

interface Props {
  workoutId: string;
}

export function WorkoutEdit({ workoutId }: Props) {
  const workout = workouts.value.find((w) => w.id === workoutId);

  // Enter edit mode synchronously so activeWorkoutSets is populated
  // before WorkoutTracker's initialization useEffect runs
  if (workout?.type === 'weight' && !isEditMode.value) {
    enterEditMode(workoutId);
  }

  // Cleanup on unmount
  useEffect(() => {
    if (!workout) {
      navigate('/');
      return;
    }

    return () => {
      if (isEditMode.value) {
        exitEditMode();
      }
    };
  }, [workoutId]);

  if (!workout) return null;

  // Non-weight workouts use the lightweight form
  if (workout.type !== 'weight') {
    return <EditWorkoutForm workoutId={workoutId} />;
  }

  // Weight workouts use the tracker in edit mode
  const workoutSets = sets.value.filter((s) => s.workout_id === workoutId);
  if (!isEditMode.value && workoutSets.length === 0) return null;

  return <WorkoutTracker workoutId={workoutId} workoutName={workout.name} />;
}
