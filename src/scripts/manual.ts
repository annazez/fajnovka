/**
 * Scroll frames of the manual (tables and charts).
 * A frame is a tab stop only while its content is wider than the frame, so a keyboard user does not stop at each table.
 */
const scrollFrames = document.querySelectorAll<HTMLElement>('.scroll');

function update(): void {
  for (const frame of scrollFrames) {
    if (frame.scrollWidth > frame.clientWidth) frame.setAttribute('tabindex', '0');
    else frame.removeAttribute('tabindex');
  }
}

new ResizeObserver(update).observe(document.documentElement);
update();

export {};
