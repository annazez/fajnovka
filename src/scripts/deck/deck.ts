/**
 * The deck: one visible slide, the route, and the events that tell slides when they enter and leave.
 * The first slide is visible in the HTML, so the page shows content before this script runs.
 */
import { countUp } from './count.ts';
import { all, pageLanguage, required } from './dom.ts';
import { emit, type DeckChange } from './events.ts';

export interface Deck {
  readonly total: number;
  readonly index: number;
  readonly slide: HTMLElement;
  go(target: number): void;
  next(): void;
  previous(): void;
  start(): void;
}

/** The title that a screen reader hears: the text of the element that labels the slide, with its line breaks as spaces. */
function titleOf(slide: HTMLElement): string {
  const label = document.getElementById(slide.getAttribute('aria-labelledby') ?? '');
  if (!label) return '';
  // A copy, because the rendered text of a slide that just became visible is not ready yet.
  const copy = label.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('br').forEach((lineBreak) => lineBreak.replaceWith(' '));
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function createDeck(root: HTMLElement, canAnimate: () => boolean): Deck {
  const slides = all<HTMLElement>('[data-slide]', root);
  const stops = all<HTMLElement>('[data-stop]', root);
  const announcer = required<HTMLElement>('[data-announce]', root);
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const language = pageLanguage();
  let current = Math.max(
    slides.findIndex((slide) => slide.classList.contains('is-active')),
    0,
  );

  const slideAt = (index: number): HTMLElement => {
    const slide = slides[index];
    if (!slide) throw new Error(`Deck: slide ${index} is missing`);
    return slide;
  };

  /** Updates everything that depends on the current slide, except the slide itself. */
  const sync = (announce: boolean): void => {
    const slide = slideAt(current);
    const change: DeckChange = { index: current, total: slides.length, title: titleOf(slide) };

    root.dataset.theme = slide.dataset.theme;
    root.style.setProperty('--progress', String(current / (slides.length - 1)));
    // The browser frame of a phone takes the colour of the slide.
    themeColor?.setAttribute('content', getComputedStyle(slide).getPropertyValue('--bg').trim());
    stops.forEach((stop, index) => {
      stop.toggleAttribute('data-passed', index < current);
      if (index === current) stop.setAttribute('aria-current', 'step');
      else stop.removeAttribute('aria-current');
    });
    history.replaceState(null, '', `#${current + 1}`);

    if (announce) {
      announcer.textContent = (announcer.dataset.template ?? '%title')
        .replace('%n', String(change.index + 1))
        .replace('%total', String(change.total))
        .replace('%title', change.title);
    }
    emit(root, 'deck:change', change);
  };

  const go = (target: number): void => {
    const next = Math.min(Math.max(target, 0), slides.length - 1);
    if (next === current) return;

    const leaving = slideAt(current);
    leaving.classList.remove('is-active');
    leaving.inert = true;
    emit(leaving, 'slide:leave');

    current = next;
    const entering = slideAt(current);
    entering.inert = false;
    entering.scrollTop = 0;
    entering.classList.add('is-active');
    all<HTMLElement>('[data-count]', entering).forEach((element) => countUp(element, language, canAnimate()));
    sync(true);
    emit(entering, 'slide:enter');
  };

  return {
    total: slides.length,
    get index() {
      return current;
    },
    get slide() {
      return slideAt(current);
    },
    go,
    next: () => go(current + 1),
    previous: () => go(current - 1),
    start() {
      // The order of entrance comes from the data-in value. The script sets it, so the page needs no inline styles.
      all<HTMLElement>('[data-in]', root).forEach((element) => element.style.setProperty('--i', element.dataset.in || '0'));
      root.classList.add('is-live');

      const requested = Number.parseInt(location.hash.slice(1), 10);
      if (Number.isNaN(requested) || requested - 1 === current) sync(false);
      else go(requested - 1);

      addEventListener('hashchange', () => {
        const target = Number.parseInt(location.hash.slice(1), 10);
        if (!Number.isNaN(target)) go(target - 1);
      });
    },
  };
}
