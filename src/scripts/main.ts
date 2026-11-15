/** Entry point of the deck page: builds the parts and connects them. */
import { createDeck } from './deck/deck.ts';
import { required } from './deck/dom.ts';
import { emit } from './deck/events.ts';
import { createFullscreen } from './deck/fullscreen.ts';
import { bindInput } from './deck/input.ts';
import { createMotion } from './deck/motion.ts';
import { createNotes } from './deck/notes.ts';

const root = required<HTMLElement>('[data-deck]');
const motion = createMotion(root, required<HTMLElement>('[data-action="motion"]', root));
const fullscreen = createFullscreen(root, required<HTMLElement>('[data-action="fullscreen"]', root));
const notes = createNotes(required<HTMLElement>('[data-notes-panel]', root));
const deck = createDeck(root, () => motion.running);

root.addEventListener('deck:change', (event) => {
  notes.show(deck.slide.dataset.notes ?? '');
  if (event.detail.index > 0) notes.start();
});

bindInput(root, deck, {
  motion: () => motion.toggle(),
  fullscreen: () => void fullscreen.toggle(),
  notes: () => notes.toggle(),
  resetTimer: () => notes.reset(),
  live: () => emit(deck.slide, 'slide:live'),
});

deck.start();
