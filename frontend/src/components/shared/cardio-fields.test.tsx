import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import { CardioFields, hasCardioFields, storedToCardio } from './cardio-fields';
import type { CardioValues } from './cardio-fields';

afterEach(cleanup);

const EMPTY: CardioValues = { distance: '', ascent: '', descent: '', avgHr: '' };

function renderFields(workoutType: string, values: Partial<CardioValues> = {}) {
  const onChange = vi.fn();
  const result = render(h(CardioFields as any, {
    workoutType, values: { ...EMPTY, ...values }, onChange, idPrefix: 'test',
  }));
  return { ...result, onChange };
}

const labels = (c: Element) => [...c.querySelectorAll('label')].map((l) => l.textContent!.trim());

// Issue #103 — cardio attributes for bike and hike.
describe('CardioFields', () => {
  // AC1: only the types that earn them, correctly ordered and labelled.
  describe('AC1: type-conditional rendering', () => {
    it('shows Distance, Ascent and Avg HR on a bike — and not Descent', () => {
      const { container } = renderFields('bike');
      expect(labels(container)).toEqual(['Distance (miles)', 'Ascent (feet)', 'Avg HR (bpm)']);
    });

    it('shows all four on a hike, ordered by how often each is filled', () => {
      const { container } = renderFields('hike');
      expect(labels(container)).toEqual([
        'Distance (miles)', 'Ascent (feet)', 'Descent (feet)', 'Avg HR (bpm)',
      ]);
    });

    it('renders nothing at all for a weight workout', () => {
      const { container } = renderFields('weight');
      expect(container.querySelector('.cardio-fields')).toBeNull();
      expect(container.querySelectorAll('input')).toHaveLength(0);
    });

    it('renders nothing at all for a stretch', () => {
      const { container } = renderFields('stretch');
      expect(container.querySelector('.cardio-fields')).toBeNull();
    });

    it('carries the unit in the label, not only the placeholder', () => {
      // WCAG 3.3.2 — a placeholder disappears on the first keystroke, and here
      // the stored unit differs from the entered one.
      const { container } = renderFields('hike');
      for (const label of labels(container)) {
        expect(label).toMatch(/\((miles|feet|bpm)\)$/);
      }
    });

    it('associates every label with its input via htmlFor and id', () => {
      const { container } = renderFields('hike');
      const pairs = [...container.querySelectorAll('label')].map((l) => l.getAttribute('for'));
      expect(pairs.every(Boolean)).toBe(true);
      for (const id of pairs) {
        expect(container.querySelector(`#${id}`)).toBeTruthy();
      }
    });

    it('groups the fields so they read as a unit', () => {
      const { container } = renderFields('bike');
      const group = container.querySelector('.cardio-fields')!;
      expect(group.tagName).toBe('FIELDSET');
      expect(group.querySelector('legend')!.textContent).toContain('Ride');
    });

    it('namespaces ids by prefix so two forms cannot collide', () => {
      const { container } = renderFields('bike');
      expect(container.querySelector('#test-distance')).toBeTruthy();
    });
  });

  // AC2: mobile entry — the decimal keypad is the difference between 12.4
  // being typeable and not.
  describe('AC2: input modes', () => {
    it('gives Distance a decimal keypad', () => {
      const { container } = renderFields('bike');
      expect(container.querySelector('#test-distance')!.getAttribute('inputmode')).toBe('decimal');
    });

    it('gives the whole-number fields a numeric keypad', () => {
      const { container } = renderFields('hike');
      for (const key of ['ascent', 'descent', 'avgHr']) {
        expect(container.querySelector(`#test-${key}`)!.getAttribute('inputmode')).toBe('numeric');
      }
    });

    it('tells the user about the 10-foot precision rather than applying it silently', () => {
      const { container } = renderFields('hike');
      expect(container.querySelector('.cardio-fields-note')!.textContent).toMatch(/nearest 10 feet/);
    });
  });

  // AC3: empty renders blank, and a stored 0 is not empty.
  describe('AC3: empty is never zero', () => {
    it('seeds blank fields from an unset workout, never "0"', () => {
      expect(storedToCardio(undefined)).toEqual(EMPTY);
      expect(storedToCardio({ distance_m: '', ascent_m: '', descent_m: '', avg_hr: '' })).toEqual(EMPTY);
    });

    it('seeds imperial values from stored meters', () => {
      expect(storedToCardio({ distance_m: '19956', ascent_m: '457', descent_m: '', avg_hr: '136' }))
        .toEqual({ distance: '12.4', ascent: '1500', descent: '', avgHr: '136' });
    });

    it('seeds a deliberate stored 0 as "0", distinct from blank', () => {
      expect(storedToCardio({ distance_m: '0', ascent_m: '', descent_m: '', avg_hr: '0' }))
        .toEqual({ distance: '0', ascent: '', descent: '', avgHr: '0' });
    });
  });
});

describe('hasCardioFields', () => {
  it('is true only for bike and hike', () => {
    expect(hasCardioFields('bike')).toBe(true);
    expect(hasCardioFields('hike')).toBe(true);
    expect(hasCardioFields('weight')).toBe(false);
    expect(hasCardioFields('stretch')).toBe(false);
  });
});
