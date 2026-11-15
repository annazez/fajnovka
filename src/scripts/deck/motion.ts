/**
 * Motion switch. Loops run until the user pauses them (WCAG 2.2.2).
 * They start paused when the system asks for reduced motion.
 */
import { emit } from './events.ts';

export interface Motion {
  readonly running: boolean;
  toggle(): void;
}

export function createMotion(deck: HTMLElement, button: HTMLElement): Motion {
  let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const apply = (): void => {
    deck.dataset.motion = running ? 'running' : 'paused';
    const label = running ? button.dataset.labelPause : button.dataset.labelPlay;
    if (label) button.setAttribute('aria-label', label);
    emit(deck, 'deck:motion', { running });
  };

  apply();

  return {
    get running() {
      return running;
    },
    toggle() {
      running = !running;
      apply();
    },
  };
}
