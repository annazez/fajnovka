/** Speaker notes with a timer. The timer starts when the speaker leaves the first slide. */
import { required } from './dom.ts';

export interface Notes {
  show(text: string): void;
  toggle(): void;
  start(): void;
  reset(): void;
}

export function createNotes(panel: HTMLElement): Notes {
  const text = required<HTMLElement>('[data-notes-text]', panel);
  const time = required<HTMLElement>('[data-notes-time]', panel);
  let startedAt: number | null = null;

  setInterval(() => {
    if (panel.hidden) return;
    const seconds = startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
    time.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }, 500);

  return {
    show(value) {
      text.textContent = value;
    },
    toggle() {
      panel.hidden = !panel.hidden;
    },
    start() {
      startedAt ??= Date.now();
    },
    reset() {
      startedAt = null;
    },
  };
}
