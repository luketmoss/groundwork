import type { WorkoutType, Workout } from '../../api/types';
import { ELEVATION_STEP_FT, metersToMilesInput, metersToFeetInput } from '../../api/units';

/** Imperial strings as typed. Conversion to meters happens on save. */
export interface CardioValues {
  distance: string;
  ascent: string;
  descent: string;
  avgHr: string;
}

interface Props {
  workoutType: WorkoutType;
  values: CardioValues;
  onChange: (patch: Partial<CardioValues>) => void;
  /** Namespaces the input ids so two forms on one page can't collide. */
  idPrefix: string;
}

/** Seeds the form from stored meters. An unset field seeds blank, never "0". */
export function storedToCardio(w: Pick<Workout, 'distance_m' | 'ascent_m' | 'descent_m' | 'avg_hr'> | undefined): CardioValues {
  return {
    distance: metersToMilesInput(w?.distance_m ?? ''),
    ascent: metersToFeetInput(w?.ascent_m ?? ''),
    descent: metersToFeetInput(w?.descent_m ?? ''),
    avgHr: w?.avg_hr ?? '',
  };
}

/** Only `bike` and `hike` earn these fields. */
export function hasCardioFields(type: WorkoutType): boolean {
  return type === 'bike' || type === 'hike';
}

/**
 * Cardio attributes for `bike` and `hike` (#103).
 *
 * Field order is by how often each is filled, so the common case needs the
 * least scrolling. `bike` omits Descent: on a loop ride it correlates with
 * ascent and earns nothing.
 *
 * Units live in the labels, not the placeholders — a placeholder disappears on
 * the first keystroke (WCAG 3.3.2), and here the stored unit differs from the
 * entered one, so the label has to carry it.
 */
export function CardioFields({ workoutType, values, onChange, idPrefix }: Props) {
  if (!hasCardioFields(workoutType)) return null;

  const showDescent = workoutType === 'hike';

  const field = (
    key: keyof CardioValues,
    label: string,
    placeholder: string,
    decimal: boolean,
  ) => {
    const id = `${idPrefix}-${key}`;
    return (
      <div class="form-group">
        <label class="form-label" htmlFor={id}>{label}</label>
        <input
          id={id}
          class="form-input"
          type="number"
          // Distance must be `decimal`: on iOS Safari `numeric` renders a
          // digits-only keypad and "12.4" becomes physically untypeable.
          inputMode={decimal ? 'decimal' : 'numeric'}
          step={decimal ? '0.1' : '1'}
          placeholder={placeholder}
          value={values[key]}
          onInput={(e) => onChange({ [key]: (e.target as HTMLInputElement).value })}
        />
      </div>
    );
  };

  return (
    <fieldset class="cardio-fields">
      <legend class="cardio-fields-legend">
        {workoutType === 'bike' ? 'Ride details' : 'Hike details'}
      </legend>
      {field('distance', 'Distance (miles)', 'e.g. 12.4', true)}
      {field('ascent', 'Ascent (feet)', 'e.g. 1500', false)}
      {showDescent && field('descent', 'Descent (feet)', 'e.g. 1500', false)}
      {field('avgHr', 'Avg HR (bpm)', 'e.g. 136', false)}
      <p class="cardio-fields-note">
        Elevation is recorded to the nearest {ELEVATION_STEP_FT} feet.
      </p>
    </fieldset>
  );
}
