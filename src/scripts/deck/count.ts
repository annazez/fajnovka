/** Counts a number up to its final value. The last steps are slow, so the reader sees the number settle. */

const DURATION = 2200;
const DELAY = 350;

/** Fast start, long slow end: 80 % of the value arrives in the first third of the time. */
function settle(progress: number): number {
  return 1 - (1 - progress) ** 5;
}

export function countUp(element: HTMLElement, language: string, animate: boolean): void {
  const target = Number(element.dataset.count);
  const digits = Number(element.dataset.digits ?? 0);
  const formatter = new Intl.NumberFormat(language, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const show = (value: number): void => {
    element.textContent = formatter.format(value);
  };

  if (!animate) {
    show(target);
    return;
  }

  const start = performance.now() + DELAY;
  show(0);

  const tick = (now: number): void => {
    const progress = Math.min(Math.max((now - start) / DURATION, 0), 1);
    if (progress < 1 && element.closest('.is-active')) {
      show(Number((target * settle(progress)).toFixed(digits)));
      requestAnimationFrame(tick);
    } else {
      show(target);
    }
  };
  requestAnimationFrame(tick);
}
