/**
 * A small builder for SVG and HTML markup as text.
 * `Markup` is text that is safe to put in a page. Only `text` and `element` make it, so plain text is always escaped.
 */
import { need } from './need.ts';

declare const safe: unique symbol;
export type Markup = string & { readonly [safe]: true };

type Attributes = Readonly<Record<string, string | number | undefined>>;

/** The characters that have a meaning in text and in a quoted attribute, with their safe forms. */
const ENTITIES = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
]);

/** One pass changes each of these characters, so the order of the changes does not matter. */
function escape(value: string): string {
  return value.replace(/[&<>"]/g, (character) => need(ENTITIES.get(character), `The safe form of ${character}`));
}

/** Plain text as markup. */
export function text(value: string): Markup {
  return escape(value) as Markup;
}

/** Joins pieces of markup. */
export function join(...parts: readonly Markup[]): Markup {
  return parts.join('') as Markup;
}

/** One element. An attribute with the value `undefined` is left out. */
export function element(name: string, attributes: Attributes = {}, ...children: readonly Markup[]): Markup {
  const pairs = Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join('');
  return `<${name}${pairs}>${children.join('')}</${name}>` as Markup;
}
