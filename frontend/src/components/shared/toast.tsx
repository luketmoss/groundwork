import { toasts } from '../../state/store';

export function Toast() {
  if (toasts.value.length === 0) return null;

  return (
    <div class="toast-container" role="status" aria-live="polite">
      {toasts.value.map(t => (
        <div
          key={t.id}
          class={`toast toast-${t.type}`}
          role={t.type === 'error' ? 'alert' : undefined}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
