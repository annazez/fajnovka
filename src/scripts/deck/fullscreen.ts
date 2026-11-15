/** Fullscreen with a screen wake lock, so the projector does not sleep during the pitch. */

export function createFullscreen(deck: HTMLElement, button: HTMLElement): { toggle(): Promise<void> } {
  let wakeLock: WakeLockSentinel | null = null;

  const keepAwake = async (): Promise<void> => {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null; // The browser can refuse, for example on low battery. The deck works without it.
    }
  };

  if (!document.fullscreenEnabled) deck.classList.add('no-fullscreen');

  document.addEventListener('fullscreenchange', () => {
    const active = document.fullscreenElement !== null;
    deck.classList.toggle('is-fullscreen', active);
    const label = active ? button.dataset.labelExit : button.dataset.labelEnter;
    if (label) button.setAttribute('aria-label', label);
    if (active) void keepAwake();
    else void wakeLock?.release();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.fullscreenElement) void keepAwake();
  });

  return {
    async toggle() {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    },
  };
}
