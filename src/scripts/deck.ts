/**
 * Deck engine.
 * Shows one slide at a time and handles keyboard, clicker, touch, fullscreen and speaker notes.
 * Each slide receives a `slide:enter` and a `slide:leave` event, so slides own their animations.
 */

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Deck: ${selector} is missing`);
  return element;
}

const deck = required<HTMLElement>('[data-deck]');
const notesPanel = required<HTMLElement>('[data-notes-panel]');
const notesText = required<HTMLElement>('[data-notes-text]');
const notesTime = required<HTMLElement>('[data-notes-time]');
const slides = Array.from(deck.querySelectorAll<HTMLElement>('[data-slide]'));
const stops = Array.from(deck.querySelectorAll<HTMLElement>('[data-stop]'));

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) document.querySelectorAll('svg').forEach((svg) => svg.pauseAnimations());
const czech = new Intl.NumberFormat('cs-CZ');

let current = -1;
let startedAt: number | null = null;

/* ---------- Navigation ---------- */

function go(target: number): void {
  const next = Math.min(Math.max(target, 0), slides.length - 1);
  if (next === current) return;

  const previous = slides[current];
  previous?.classList.remove('is-active');
  previous?.dispatchEvent(new CustomEvent('slide:leave'));

  current = next;
  const slide = slides[current];
  if (!slide) return;

  slide.classList.add('is-active');
  deck.dataset.theme = slide.dataset.theme;
  deck.style.setProperty('--progress', String(current / (slides.length - 1)));
  stops.forEach((stop, index) => {
    stop.toggleAttribute('data-passed', index < current);
    if (index === current) stop.setAttribute('aria-current', 'step');
    else stop.removeAttribute('aria-current');
  });

  notesText.textContent = slide.dataset.notes ?? '';
  history.replaceState(null, '', `#${current + 1}`);
  if (current > 0 && startedAt === null) startedAt = Date.now();

  slide.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
  slide.dispatchEvent(new CustomEvent('slide:enter'));
}

const next = (): void => go(current + 1);
const previous = (): void => go(current - 1);

/** Counts a number up to the value in data-count, in Czech number format. */
function countUp(element: HTMLElement): void {
  const target = Number(element.dataset.count);
  if (reducedMotion) {
    element.textContent = czech.format(target);
    return;
  }

  const duration = 1500;
  const delay = 350;
  const start = performance.now() + delay;
  element.textContent = czech.format(0);

  const tick = (now: number): void => {
    const progress = Math.min(Math.max((now - start) / duration, 0), 1);
    const eased = 1 - (1 - progress) ** 4;
    element.textContent = czech.format(Math.round(target * eased));
    if (progress < 1 && element.closest('.is-active')) requestAnimationFrame(tick);
    else element.textContent = czech.format(target);
  };
  requestAnimationFrame(tick);
}

/* ---------- Fullscreen and screen wake lock ---------- */

let wakeLock: WakeLockSentinel | null = null;

async function keepAwake(): Promise<void> {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch {
    wakeLock = null;
  }
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
}

document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement !== null;
  deck.classList.toggle('is-fullscreen', active);
  if (active) void keepAwake();
  else void wakeLock?.release();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.fullscreenElement) void keepAwake();
});

if (!document.fullscreenEnabled) deck.classList.add('no-fullscreen');

/* ---------- Speaker notes ---------- */

function toggleNotes(): void {
  notesPanel.hidden = !notesPanel.hidden;
}

setInterval(() => {
  if (notesPanel.hidden) return;
  const seconds = startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  notesTime.textContent = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}, 500);

/* ---------- Input: keyboard and clicker ---------- */

const keys: Record<string, () => void> = {
  ArrowRight: next,
  ArrowDown: next,
  PageDown: next,
  ' ': next,
  Enter: next,
  ArrowLeft: previous,
  ArrowUp: previous,
  PageUp: previous,
  Backspace: previous,
  Home: () => go(0),
  End: () => go(slides.length - 1),
  f: () => void toggleFullscreen(),
  n: toggleNotes,
  r: () => {
    startedAt = null;
  },
};

addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const onControl = event.target instanceof Element && event.target.closest('button') !== null;
  if (onControl && (event.key === ' ' || event.key === 'Enter')) return;

  if (/^[1-9]$/.test(event.key)) {
    go(Number(event.key) - 1);
    return;
  }

  const action = keys[event.key] ?? keys[event.key.toLowerCase()];
  if (!action) return;
  event.preventDefault();
  action();
});

/* ---------- Input: pointer ---------- */

deck.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest<HTMLElement>('[data-go], [data-stop], [data-fullscreen]');
  if (!control) return;

  if (control.dataset.go === 'next') next();
  else if (control.dataset.go === 'prev') previous();
  else if (control.dataset.stop !== undefined) go(Number(control.dataset.stop));
  else void toggleFullscreen();

  // A mouse click must not keep focus, or Space would press the button again.
  if (event.detail > 0) control.blur();
});

let swipeStart: { x: number; y: number } | null = null;

deck.addEventListener('pointerdown', (event) => {
  swipeStart = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
});

deck.addEventListener('pointerup', (event) => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
  if (dx < 0) next();
  else previous();
});

let idleTimer = 0;

function wake(): void {
  deck.classList.remove('is-idle');
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => deck.classList.add('is-idle'), 2500);
}

addEventListener('pointermove', wake);
wake();

/* ---------- Start ---------- */

addEventListener('hashchange', () => {
  const requested = Number.parseInt(location.hash.slice(1), 10);
  if (!Number.isNaN(requested)) go(requested - 1);
});

const requested = Number.parseInt(location.hash.slice(1), 10);
const first = Number.isNaN(requested) ? 0 : requested - 1;
const fontsReady = Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1200))]);

void fontsReady.then(() => go(first));
