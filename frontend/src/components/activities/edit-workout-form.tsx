import { useState } from 'preact/hooks';
import { workouts } from '../../state/store';
import { saveSimpleWorkoutEdits } from '../../state/actions';
import { useAuth } from '../../auth/auth-context';
import { navigate } from '../../router/router';
import { secondsToMinutesInput, minutesToSeconds } from '../../api/duration';
import { EffortToggle } from '../shared/effort-toggle';
import type { Effort } from '../../api/types';

interface Props {
  workoutId: string;
}

export function EditWorkoutForm({ workoutId }: Props) {
  const { token } = useAuth();
  const workout = workouts.value.find((w) => w.id === workoutId);

  const [date, setDate] = useState(workout?.date || '');
  const [name, setName] = useState(workout?.name || '');
  const [duration, setDuration] = useState(secondsToMinutesInput(workout?.elapsed_seconds ?? ''));
  const [notes, setNotes] = useState(workout?.notes || '');
  const [effort, setEffort] = useState<Effort | ''>(workout?.effort || '');
  const [saving, setSaving] = useState(false);

  if (!workout) {
    return (
      <div class="screen">
        <div class="empty-state">
          <p>Workout not found</p>
          <button class="btn btn-primary" onClick={() => navigate('/')}>Back to Activities</button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await saveSimpleWorkoutEdits(workoutId, { date, name: name.trim(), notes: notes.trim(), elapsed_seconds: minutesToSeconds(duration), effort }, token);
      navigate(`/history/${workoutId}`);
    } catch {
      // Error toast shown by action
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (date !== workout.date || name !== workout.name || duration !== secondsToMinutesInput(workout.elapsed_seconds) || notes !== workout.notes || effort !== (workout.effort || '')) {
      if (!confirm('Discard changes? Your edits will not be saved.')) return;
    }
    navigate(`/history/${workoutId}`);
  };

  return (
    <div class="screen simple-workout-form">
      <div class="template-editor-header">
        <button
          class="template-editor-back"
          onClick={handleDiscard}
          aria-label="Back"
        >
          ← Back
        </button>
        <button
          class="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <h2 class="detail-title" style={{ marginBottom: 'var(--space-md)' }}>
        Edit: {workout.name || workout.type}
      </h2>

      <div class="form-group">
        <label class="form-label">Name</label>
        <input
          class="form-input"
          type="text"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="form-group">
        <label class="form-label">Date</label>
        <input
          class="form-input"
          type="date"
          value={date}
          onInput={(e) => setDate((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="form-group">
        <label class="form-label">Duration (minutes)</label>
        <input
          class="form-input"
          type="number"
          inputMode="numeric"
          placeholder="e.g. 30"
          value={duration}
          onInput={(e) => setDuration((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="form-group">
        <label class="form-label">Session Effort (optional)</label>
        <EffortToggle
          value={effort}
          onChange={setEffort}
          size="session"
          label="Session effort"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea
          class="form-textarea"
          placeholder="How did it go?"
          rows={5}
          value={notes}
          onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      <button
        class="btn btn-danger"
        style={{ width: '100%', marginTop: 'var(--space-lg)' }}
        onClick={handleDiscard}
      >
        Discard Changes
      </button>
    </div>
  );
}
