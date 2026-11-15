/**
 * Slide 8: the payback year for three scenarios.
 * The scenarios change by themselves, because the speaker cannot click during the pitch.
 * The first click on a scenario stops the change. The motion switch stops it too.
 */
import { scene } from '../deck/scene.ts';

const ORDER = ['base', 'better', 'worse'] as const;
const FIRST_CHANGE_AFTER = 4200;
const CHANGE_EVERY = 2800;

scene('economics', (context) => {
  const figure = context.slide.querySelector<HTMLElement>('[data-scenario]');
  const buttons = Array.from(context.slide.querySelectorAll<HTMLButtonElement>('[data-choose]'));
  let timer = 0;
  let chosen = false;

  const show = (name: string): void => {
    if (!figure) return;
    figure.dataset.scenario = name;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.choose === name));
  };

  const stop = (): void => {
    clearTimeout(timer);
    timer = 0;
  };

  const cycle = (delay: number): void => {
    stop();
    if (chosen || !context.running || !context.active) return;
    timer = window.setTimeout(() => {
      const current = ORDER.findIndex((name) => name === figure?.dataset.scenario);
      show(ORDER[(current + 1) % ORDER.length] ?? 'base');
      cycle(CHANGE_EVERY);
    }, delay);
  };

  for (const button of buttons) {
    button.addEventListener('click', (event) => {
      chosen = true;
      stop();
      show(button.dataset.choose ?? 'base');
      // A mouse click must not keep focus, or Space would press the button again.
      if (event.detail > 0) button.blur();
    });
  }

  return {
    enter() {
      if (!chosen) show('base');
      cycle(FIRST_CHANGE_AFTER);
    },
    leave: stop,
    motion: (running) => (running ? cycle(CHANGE_EVERY) : stop()),
  };
});
