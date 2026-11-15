/** Keyboard, clicker, pointer and touch input. */
import type { Deck } from './deck.ts';
import { isFlowLayout } from './dom.ts';

export interface Actions {
  motion(): void;
  fullscreen(): void;
  notes(): void;
  resetTimer(): void;
  live(): void;
}

const IDLE_AFTER = 2500;
const SWIPE_DISTANCE = 60;

/** In the flow layout a slide can be longer than the screen. Keys scroll it first and change the slide at its end. */
function scrolled(slide: HTMLElement, direction: 1 | -1): boolean {
  if (!isFlowLayout()) return false;
  const room = direction === 1 ? slide.scrollHeight - slide.clientHeight - slide.scrollTop : slide.scrollTop;
  if (room <= 1) return false;
  slide.scrollBy({ top: direction * slide.clientHeight * 0.8, behavior: 'smooth' });
  return true;
}

export function bindInput(root: HTMLElement, deck: Deck, actions: Actions): void {
  const forward = (): void => {
    if (!scrolled(deck.slide, 1)) deck.next();
  };
  const back = (): void => {
    if (!scrolled(deck.slide, -1)) deck.previous();
  };

  const keys: Record<string, () => void> = {
    ArrowRight: deck.next,
    ArrowLeft: deck.previous,
    ArrowDown: forward,
    ArrowUp: back,
    PageDown: forward,
    PageUp: back,
    ' ': forward,
    Enter: deck.next,
    Backspace: deck.previous,
    Home: () => deck.go(0),
    End: () => deck.go(deck.total - 1),
    f: actions.fullscreen,
    l: actions.live,
    n: actions.notes,
    p: actions.motion,
    r: actions.resetTimer,
  };

  addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    // Space and Enter belong to the focused link or button.
    const onControl = event.target instanceof Element && event.target.closest('a, button') !== null;
    if (onControl && (event.key === ' ' || event.key === 'Enter')) return;

    if (/^[1-9]$/.test(event.key)) {
      deck.go(Number(event.key) - 1);
      return;
    }

    const action = keys[event.key] ?? keys[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  });

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest<HTMLElement>('[data-action], [data-stop]');
    if (!control) return;

    if (control.dataset.stop !== undefined) deck.go(Number(control.dataset.stop));
    else if (control.dataset.action === 'next') deck.next();
    else if (control.dataset.action === 'previous') deck.previous();
    else if (control.dataset.action === 'motion') actions.motion();
    else if (control.dataset.action === 'fullscreen') actions.fullscreen();
    else return;

    // A mouse click must not keep focus, or Space would press the button again.
    if (event.detail > 0) control.blur();
  });

  let swipeStart: { x: number; y: number } | null = null;

  root.addEventListener('pointerdown', (event) => {
    swipeStart = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
  });

  root.addEventListener('pointerup', (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) deck.next();
    else deck.previous();
  });

  root.addEventListener('pointercancel', () => {
    swipeStart = null;
  });

  // The pointer and the buttons leave the picture while nobody moves the pointer.
  let idleTimer = 0;
  const wake = (): void => {
    root.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => root.classList.add('is-idle'), IDLE_AFTER);
  };
  addEventListener('pointermove', wake);
  addEventListener('pointerdown', wake);
  wake();
}
