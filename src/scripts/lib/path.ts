/** Moves an HTML element along an SVG path with the Web Animations API (transform only). */

interface FollowOptions {
  /** Seconds for one trip along the path. */
  duration: number;
  /** Seconds; a negative value starts the trip in the middle. */
  delay?: number;
  samples?: number;
}

/**
 * The path uses tenths of an em of the element's container, so the motion scales with the layout.
 * The element must sit at the top left corner of the same container as the SVG.
 */
export function followPath(node: HTMLElement, path: SVGPathElement, { duration, delay = 0, samples = 48 }: FollowOptions): Animation {
  const total = path.getTotalLength();
  const frames = Array.from({ length: samples + 1 }, (_, index) => {
    const point = path.getPointAtLength((total * index) / samples);
    return { transform: `translate(${(point.x / 10).toFixed(3)}em, ${(point.y / 10).toFixed(3)}em)` };
  });
  return node.animate(frames, { duration: duration * 1000, delay: delay * 1000, iterations: Infinity });
}
