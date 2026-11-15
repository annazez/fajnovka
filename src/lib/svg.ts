/**
 * A small builder for SVG and HTML markup as text.
 * `Markup` is text that is safe to put in a page. Only `text` and `element` make it, so plain text is always escaped.
 */
declare const safe: unique symbol;
export type Markup = string & { readonly [safe]: true };

type Attributes = Readonly<Record<string, string | number | undefined>>;

const ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escape(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ENTITIES[character] ?? character);
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
