import { useState, useEffect } from 'preact/hooks';
import { workouts, activeWorkoutId, activeWorkoutSets, activeWarmupExercises, sets, templates } from '../../state/store';
import { startWorkout, saveWorkoutForLater } from '../../state/actions';
import { useAuth } from '../../auth/auth-context';
import { navigate } from '../../router/router';
import { TypeSelector } from './type-selector';
import { TemplatePicker } from './template-picker';
import { WorkoutTracker } from './workout-tracker';
import { SimpleWorkout } from './simple-workout';
import { PlanActionSheet } from './plan-action-sheet';
import { WorkoutBuilder } from './workout-builder';
import type { WorkoutType, BuilderExercise } from '../../api/types';

type FlowStep = 'type' | 'template' | 'builder' | 'tracker' | 'simple';

interface Props {
  workoutId?: string;
}

export function WorkoutFlow({ workoutId }: Props) {
  const { token } = useAuth();
  const [step, setStep] = useState<FlowStep>('type');
  const [selectedType, setSelectedType] = useState<WorkoutType>('weight');
  const [activeId, setActiveId] = useState<string | null>(workoutId || null);
  const [workoutName, setWorkoutName] = useState('');
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Action sheet state (for template path only)
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  // If resuming an existing workout, jump to the correct step
  useEffect(() => {
    if (!workoutId) return;

    const workout = workouts.value.find((w) => w.id === workoutId);
    if (!workout) {
      navigate('/');
      return;
    }

    setSelectedType(workout.type);
    setWorkoutName(workout.name);
    activeWorkoutId.value = workoutId;

    // Load this workout's sets into activeWorkoutSets
    activeWorkoutSets.value = sets.value.filter((s) => s.workout_id === workoutId);

    // Restore warmup exercises from template (exclude any already in sets)
    if (workout.template_id) {
      const tpl = templates.value.find((t) => t.id === workout.template_id);
      if (tpl) {
        const workoutSets = activeWorkoutSets.value;
        activeWarmupExercises.value = tpl.exercises
          .filter((ex) => ex.section === 'warmup')
          .filter((ex) => !workoutSets.some(
            (s) => s.exercise_id === ex.exercise_id && s.exercise_order === ex.order && s.section === 'warmup',
          ))
          .map((ex) => ({
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            exercise_order: ex.order,
          }));
      }
    }

    if (workout.type === 'weight') {
      setStep('tracker');
    } else {
      setStep('simple');
    }
  }, [workoutId]);

  const handleTypeSelect = (type: WorkoutType) => {
    setSelectedType(type);
    if (type === 'weight') {
      setStep('template');
    } else {
      setStep('simple');
    }
  };

  // Called when the user taps a template card — show the action sheet
  const handleTemplateCardTap = (templateId: string) => {
    setPendingTemplateId(templateId);
    setShowActionSheet(true);
  };

  // Called when the user taps "Build Custom" — navigate to builder screen
  const handleBuildCustomTap = () => {
    setStep('builder');
  };

  const handleCancelActionSheet = () => {
    setShowActionSheet(false);
    setPendingTemplateId(null);
  };

  // "Start Now" path (template action sheet)
  const handleStartNow = async () => {
    if (!token || starting || !pendingTemplateId) return;
    setStarting(true);
    try {
      const tpl = templates.value.find((t) => t.id === pendingTemplateId);
      const name = tpl?.name || 'Workout';
      const id = await startWorkout({ type: 'weight', name, template_id: pendingTemplateId }, token);

      setShowActionSheet(false);
      setActiveId(id);
      setWorkoutName(name);
      setStep('tracker');
      window.location.hash = `#/workout/${id}`;
    } catch {
      // Error toast shown by action
    } finally {
      setStarting(false);
    }
  };

  // "Save for Later" path (template action sheet)
  const handleSaveForLater = async () => {
    if (!token || saving || !pendingTemplateId) return;
    setSaving(true);
    try {
      const tpl = templates.value.find((t) => t.id === pendingTemplateId);
      const name = tpl?.name || 'Workout';
      await saveWorkoutForLater({ type: 'weight', name, template_id: pendingTemplateId }, token);
      setShowActionSheet(false);
      navigate('/');
    } catch {
      // Error toast shown by action
    } finally {
      setSaving(false);
    }
  };

  // Builder: "Start Workout" handler
  const handleBuilderStart = async (exercises: BuilderExercise[]) => {
    if (!token) return;
    setStarting(true);
    try {
      const name = 'Custom Workout';
      const id = await startWorkout({ type: 'weight', name, exercises }, token);
      setActiveId(id);
      setWorkoutName(name);
      setStep('tracker');
      window.location.hash = `#/workout/${id}`;
    } catch {
      // Error toast shown by action
    } finally {
      setStarting(false);
    }
  };

  // Builder: "Save as Planned" handler
  const handleBuilderSave = async (exercises: BuilderExercise[]) => {
    if (!token) return;
    setSaving(true);
    try {
      await saveWorkoutForLater({ type: 'weight', name: 'Custom Workout', exercises }, token);
      navigate('/');
    } catch {
      // Error toast shown by action
    } finally {
      setSaving(false);
    }
  };

  // Pending workout name for the action sheet title
  const getPendingName = () => {
    if (pendingTemplateId) {
      const tpl = templates.value.find((t) => t.id === pendingTemplateId);
      return tpl?.name || 'Workout';
    }
    return 'Workout';
  };

  if ((starting || saving) && step !== 'builder') {
    return (
      <div class="loading-screen">
        <div class="spinner" />
        <p>{saving ? 'Saving…' : 'Starting workout…'}</p>
      </div>
    );
  }

  switch (step) {
    case 'type':
      return <TypeSelector onSelect={handleTypeSelect} />;
    case 'template':
      return (
        <>
          <TemplatePicker
            onSelectTemplate={handleTemplateCardTap}
            onBuildCustom={handleBuildCustomTap}
            onBack={() => setStep('type')}
          />
          {showActionSheet && (
            <PlanActionSheet
              workoutName={getPendingName()}
              starting={starting}
              saving={saving}
              onStartNow={handleStartNow}
              onSaveForLater={handleSaveForLater}
              onCancel={handleCancelActionSheet}
            />
          )}
        </>
      );
    case 'builder':
      return (
        <WorkoutBuilder
          onBack={() => setStep('template')}
          onStartWorkout={handleBuilderStart}
          onSaveAsPlanned={handleBuilderSave}
          starting={starting}
          saving={saving}
        />
      );
    case 'tracker':
      return activeId ? (
        <WorkoutTracker workoutId={activeId} workoutName={workoutName} />
      ) : null;
    case 'simple':
      return (
        <SimpleWorkout
          workoutType={selectedType}
          onBack={() => setStep('type')}
        />
      );
    default:
      return null;
  }
}
