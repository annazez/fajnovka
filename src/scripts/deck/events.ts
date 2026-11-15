/**
 * Events of the deck. Slides and scenes listen to them; they never call the deck.
 *
 * On a slide:  `slide:enter`, `slide:leave`
 * On the deck: `deck:change` (detail: index), `deck:motion` (detail: running)
 */

export interface DeckChange {
  index: number;
  total: number;
  title: string;
}

declare global {
  interface HTMLElementEventMap {
    'slide:enter': CustomEvent<undefined>;
    'slide:leave': CustomEvent<undefined>;
    'deck:change': CustomEvent<DeckChange>;
    'deck:motion': CustomEvent<{ running: boolean }>;
  }
}

export function emit(target: HTMLElement, type: string, detail?: unknown): void {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}
