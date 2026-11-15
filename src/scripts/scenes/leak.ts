/**
 * Slide 3: passengers move between the car and the tram. More leave than come.
 * A dot starts and ends behind an icon, so it never appears or disappears in view.
 */
import { scene } from '../deck/scene.ts';
import { followPath } from '../lib/path.ts';

const TRIP_SECONDS = 11;
const DOTS = { arrive: 3, leave: 7 } as const;

scene('leak', (context) => {
  const layer = context.slide.querySelector<HTMLElement>('[data-dots]');
  const animations: Animation[] = [];

  const build = (): void => {
    if (!layer || animations.length > 0) return;
    for (const [lane, count] of Object.entries(DOTS)) {
      const path = context.slide.querySelector<SVGPathElement>(`[data-lane="${lane}"]`);
      if (!path) continue;
      for (let index = 0; index < count; index += 1) {
        const dot = document.createElement('i');
        dot.dataset.lane = lane;
        layer.append(dot);
        animations.push(followPath(dot, path, { duration: TRIP_SECONDS, delay: (-TRIP_SECONDS * index) / count }));
      }
    }
  };

  const apply = (): void => {
    for (const animation of animations) {
      if (context.running && context.active) animation.play();
      else animation.pause();
    }
  };

  return {
    enter() {
      build();
      apply();
    },
    leave: apply,
    motion: apply,
  };
});
