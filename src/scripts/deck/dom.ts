/** Small DOM helpers that fail loudly: a missing element is a bug in the page, not a state to handle. */

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- The caller names the type of the element, as with querySelector.
export function required<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Deck: ${selector} is missing`);
  return element;
}

export function all<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** The language of the page: the `lang` attribute of the document. */
export function pageLanguage(): string {
  return document.documentElement.lang || 'en';
}

/** True while the page uses the flow layout (see styles/media.css). */
export function isFlowLayout(): boolean {
  return matchMedia('(orientation: portrait), ((orientation: landscape) and (max-width: 960px) and (pointer: fine))')
    .matches;
}
