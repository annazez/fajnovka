/**
 * A scene is the script of one slide. It runs while the slide is visible and follows the motion switch.
 * A scene starts at once when its slide is already visible, so the order of the scripts on the page does not matter.
 */

export interface SceneHooks {
  /** The slide became visible. */
  enter(): void;
  /** The slide left. Stop timers and animations here. */
  leave(): void;
  /** The user paused or resumed motion. */
  motion?(running: boolean): void;
}

export interface SceneContext {
  readonly slide: HTMLElement;
  /** False while the user (or the system) asks for no motion. */
  readonly running: boolean;
  /** True while the slide is visible. */
  readonly active: boolean;
}

export function scene(id: string, create: (context: SceneContext) => SceneHooks): void {
  const slide = document.getElementById(id);
  const deck = slide?.closest<HTMLElement>('[data-deck]');
  if (!slide || !deck) return;

  const context: SceneContext = {
    slide,
    get running() {
      return deck.dataset.motion !== 'paused';
    },
    get active() {
      return slide.classList.contains('is-active');
    },
  };
  const hooks = create(context);

  slide.addEventListener('slide:enter', () => hooks.enter());
  slide.addEventListener('slide:leave', () => hooks.leave());
  deck.addEventListener('deck:motion', (event) => {
    if (context.active) hooks.motion?.(event.detail.running);
  });
  if (context.active) hooks.enter();
}
