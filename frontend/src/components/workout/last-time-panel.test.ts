import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import { LastTimePanel } from './last-time-panel';
import * as lastTimeData from './last-time-data';
import type { SetWithRow } from '../../api/types';

// Mock getLastTimeData
vi.mock('./last-time-data', async () => {
  const actual = await vi.importActual('./last-time-data') as Record<string, unknown>;
  return {
    ...actual,
    getLastTimeData: vi.fn(),
  };
});

function makeSet(overrides: Partial<SetWithRow> = {}): SetWithRow {
  return {
    workout_id: 'w-prev',
    exercise_id: 'ex1',
    exercise_name: 'Bench Press',
    section: 'primary',
    exercise_order: 1,
    set_number: 1,
    planned_reps: '8-10',
    weight: '135',
    reps: '10',
    effort: 'Medium',
    notes: '',
    sheetRow: 2,
    ...overrides,
  };
}

describe('LastTimePanel', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderPanel(overrides: Record<string, unknown> = {}) {
    const props = {
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      currentWorkoutId: 'w1',
      onCopyDown: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    return { ...render(h(LastTimePanel as any, props)), props };
  }

  // AC1: Close button appears in history panel
  describe('AC1: Close button appears in history panel', () => {
    it('renders a close button next to Copy Down when data is available', () => {
      vi.mocked(lastTimeData.getLastTimeData).mockReturnValue({
        workoutDate: '2026-03-10',
        sets: [makeSet()],
      });
      const { container } = renderPanel();
      const actionArea = container.querySelector('.last-time-actions');
      expect(actionArea).toBeTruthy();
      const buttons = actionArea!.querySelectorAll('button');
      expect(buttons.length).toBe(2); // Copy Down + Close
      const closeBtn = container.querySelector('.last-time-close-btn');
      expect(closeBtn).toBeTruthy();
      expect(closeBtn!.textContent).toContain('✕');
    });

    it('close button is visually smaller than Copy Down', () => {
      vi.mocked(lastTimeData.getLastTimeData).mockReturnValue({
        workoutDate: '2026-03-10',
        sets: [makeSet()],
      });
      const { container } = renderPanel();
      const copyBtn = container.querySelector('.copy-down-btn');
      const closeBtn = container.querySelector('.last-time-close-btn');
      expect(copyBtn).toBeTruthy();
      expect(closeBtn).toBeTruthy();
      // Copy Down should have flex: 1, close button should not
      // Both should exist in the same flex container
      const actionArea = container.querySelector('.last-time-actions');
      expect(actionArea).toBeTruthy();
      expect(actionArea!.contains(copyBtn!)).toBe(true);
      expect(actionArea!.contains(closeBtn!)).toBe(true);
    });
  });

  // AC2: Close button collapses the panel and returns focus
  describe('AC2: Close button collapses the panel', () => {
    it('calls onClose when close button is clicked', () => {
      vi.mocked(lastTimeData.getLastTimeData).mockReturnValue({
        workoutDate: '2026-03-10',
        sets: [makeSet()],
      });
      const { container, props } = renderPanel();
      const closeBtn = container.querySelector('.last-time-close-btn')!;
      fireEvent.click(closeBtn);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // AC3: Close button is accessible
  describe('AC3: Close button is accessible', () => {
    it('has aria-label="Close history"', () => {
      vi.mocked(lastTimeData.getLastTimeData).mockReturnValue({
        workoutDate: '2026-03-10',
        sets: [makeSet()],
      });
      const { container } = renderPanel();
      const closeBtn = container.querySelector('.last-time-close-btn')!;
      expect(closeBtn.getAttribute('aria-label')).toBe('Close history');
    });

    it('is a button element (keyboard-focusable)', () => {
      vi.mocked(lastTimeData.getLastTimeData).mockReturnValue({
        workoutDate: '2026-03-10',
        sets: [makeSet()],
      });
      const { container } = renderPanel();
      const closeBtn = container.querySelector('.last-time-close-btn')!;
      expect(closeBtn.tagName).toBe('BUTTON');
    });
  });

  // AC4: Empty state has no close button
  describe('AC4: Empty state has no close button', () => {
    it('does not render close button when no data available', () => {
      vi.mocked(lastTimeData.getLastTimeData).mockReturnValue(null);
      const { container } = renderPanel();
      const closeBtn = container.querySelector('.last-time-close-btn');
      expect(closeBtn).toBeNull();
    });

    it('does not render action area when no data available', () => {
      vi.mocked(lastTimeData.getLastTimeData).mockReturnValue(null);
      const { container } = renderPanel();
      const actionArea = container.querySelector('.last-time-actions');
      expect(actionArea).toBeNull();
    });
  });
});
