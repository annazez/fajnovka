# Rules for agents and contributors

Read `README.md` first. Then obey these rules.

## Purpose

The deck has one job: a nine-slide, three-minute pitch on a projector in fullscreen.
Do not add pages, routing, a CMS, analytics or a UI framework.

## Design rules

1. One idea for each slide. The title is a sentence that gives the point, not a topic name.
2. A slide uses one title, one hero size at most, body text, and one quiet source line. Do not add taglines, helper text or secondary labels. If a slide needs them to make sense, change the layout.
3. Use the type classes from `global.css` only: `t-title`, `t-hero`, `t-body`, `t-small`. A slide can make its hero smaller. Text inside a mock-up (the card) can have its own size.
4. Use the colour roles `--bg`, `--fg`, `--accent` and `--soft` only. Do not add colours. White text on cyan is for large shapes only.
5. Give all sizes in `rem`. The stage is 192 × 108 rem.
6. There is one graphic device: the line with stops. Use it for progress, journeys and timelines.
7. Motion shows order or change. Start each animation from `.is-active` or the `slide:enter` event. An animation must not need a click.
8. Interactive parts are optional. The arrow keys must always go to the next slide. Remove focus from a button after a mouse click, or `Space` will press it again.
9. Decorative layers must have `pointer-events: none`.

## Content rules

1. Each number comes from `src/data/numbers.ts`. One number has one value in the full deck.
2. Label an estimate as an estimate (`odhad`) and a proposal as a proposal (`návrh`). Do not invent sources, partners or results.
3. Slide text is in Czech. Code, comments and documents are in English.
4. The deck must stay clear as a static picture, without motion.
5. Use a non-breaking space after a one-letter preposition or conjunction, and between a number and its unit (`&nbsp;` in markup, `\u00a0` in strings).

## Checks before you finish

- `npm run check` and `npm run build` are successful.
- Each slide is correct at 1920 × 1080. Look at a screenshot, not only at the code.
- The fullscreen button on the first slide reacts to a click.
- The browser console shows no errors.
- Commit messages follow Conventional Commits.
