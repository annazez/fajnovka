/** The tools of the deck for an AI agent: read the slides, show a slide, read the live data of the first slide. */
import { shareOf } from '../../lib/occupancy.ts';
import { deckToolSpecs, numberFrom, plainText, type Tool } from '../../lib/tools.ts';
import { titleOf, type Deck } from './deck.ts';
import { all } from './dom.ts';
import { readOccupancy } from './live.ts';

export function deckTools(root: HTMLElement, deck: Deck): Tool[] {
  const slides = all<HTMLElement>('[data-slide]', root);
  const specs = deckToolSpecs(deck.total);

  return [
    {
      ...specs.listSlides,
      run: () => ({
        current: deck.index + 1,
        slides: slides.map((slide, index) => ({ number: index + 1, title: titleOf(slide), speakerText: plainText(slide.dataset.notes ?? '') })),
      }),
    },
    {
      ...specs.goToSlide,
      run(input) {
        deck.go(numberFrom(input, 'slide', deck.total) - 1);
        return { current: deck.index + 1, title: titleOf(deck.slide) };
      },
    },
    {
      ...specs.getLiveOccupancy,
      async run() {
        const reading = await readOccupancy(root.dataset.live);
        return { ...reading, share: Number(shareOf(reading).toFixed(3)) };
      },
    },
  ];
}
