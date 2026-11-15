/**
 * Rules for the styles (CSS files and the style blocks of Astro files).
 * The standard set finds errors. The rules below keep the design rules of AGENTS.md.
 */
const LIMIT_FUNCTIONS = ['max', 'min', 'clamp'];
const MEDIA_SIZES = ['width', 'min-width', 'max-width', 'height', 'min-height', 'max-height'];

export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/astro'],
  rules: {
    // Design rule 5: sizes in rem (or em inside a figure that scales as one piece).
    // A limit can use a different unit: a touch target and a small text have a least size in pixels on each screen.
    'unit-disallowed-list': [
      ['px', 'pt', 'pc', 'cm', 'mm', 'in', 'vw', 'vh', 'vmin', 'vmax', 'dvw', 'dvh', 'svw', 'svh', 'lvw', 'lvh'],
      { ignoreFunctions: LIMIT_FUNCTIONS, ignoreMediaFeatureNames: { px: MEDIA_SIZES } },
    ],
    // Design rule 4: a colour comes from a role in tokens.css.
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch'],
    // Class names: `block`, `block__element` and `block--modifier`. The type classes `t-*` and the states `is-*` fit too.
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Name a class as block, block__element or block--modifier.' },
    ],
    // `:global()` is the way of Astro to reach an element that a script made.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
    // The build tools read an import as a text address.
    'import-notation': 'string',
    // The order of the rules follows the parts of the page. This rule asks for an order by specificity.
    'no-descending-specificity': null,
    'number-max-precision': 5,
    // One way to write a media query, the same in the styles and in the scripts.
    'media-feature-range-notation': 'prefix',
    'value-keyword-case': ['lower', { ignoreKeywords: ['A4'] }],
  },
  overrides: [
    // The colours of the design manual are in this file only.
    { files: ['src/styles/tokens.css'], rules: { 'color-no-hex': null } },
    // These files make the unit of the stage from the size of the screen.
    {
      files: ['src/styles/tokens.css', 'src/styles/stage.css', 'src/styles/reset.css'],
      rules: { 'unit-disallowed-list': null },
    },
    // The manual is a document: its print rules use the units of paper.
    { files: ['src/styles/manual.css'], rules: { 'unit-disallowed-list': null } },
  ],
};
