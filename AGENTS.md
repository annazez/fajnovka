# Rules for agents and contributors

Read `README.md` first. Then obey these rules.

## Purpose

The site has two parts. Each part has one job.

- The deck: a nine-slide, three-minute pitch on a projector in fullscreen.
- The manual: the full proposal, as one page and one PDF for each language.

Do not add other pages, routing, a CMS, analytics or a UI framework.

## Design rules

1. One idea for each slide. The title is a sentence that gives the point, not a topic name.
2. A slide uses one title, one hero size at most, body text, and one quiet source line. Do not add taglines, helper text or secondary labels. If a slide needs them to make sense, change the layout.
3. Use the type classes from `global.css` only: `t-title`, `t-hero`, `t-body`, `t-small`. A slide can make its hero smaller. Text inside a mock-up (the card) can have its own size.
4. Use the colour roles `--bg`, `--fg`, `--accent` and `--soft` only. Do not add colours. White text on cyan is for large shapes only.
5. Give all sizes in `rem`. The stage is 192 × 108 rem. A figure that scales as one piece can use `em` inside.
6. There is one graphic device: the line with stops. Use it for progress, journeys and timelines.
7. Motion shows order or change. Start each animation from `.is-active` or the `slide:enter` event. An animation must not need a click.
8. Interactive parts are optional. The arrow keys must always go to the next slide. Remove focus from a button after a mouse click, or `Space` will press it again.
9. Decorative layers must have `pointer-events: none`.

## Content rules

1. Each number comes from `src/data/numbers.ts`. One number has one value in the full deck. A text refers to it as `{key}`.
2. Label an estimate as an estimate. Do not invent sources, partners or results.
3. Slide text lives in `src/i18n` in English and Czech. Code, comments and documents are in English.
4. The deck must stay clear as a static picture, without motion.
5. Do not type non-breaking spaces. The `typeset` function adds them.

## Manual rules

1. A chapter is one Markdown file for each language: `src/content/manual/<language>/<order>-<name>.md`. The two languages have the same blocks and the same links. A test compares them.
2. The last chapter (Sources) lists each link of the other chapters.
3. A chart is an image with the address `figure:<name>`: `![Caption.](figure:payback)`. The charts are in `src/lib/figures.ts`, and their data is in `src/data/model.ts` and `src/data/numbers.ts`.
4. A chart uses one ink colour and direct labels. It has no legend box. The accent colour fills a stop or a wash only.
5. Do not type arrows, subscripts or comparison signs. The font does not have them. Write the words.
6. After each change of the manual, run `npm run manual:pdf`. Commit the two PDF files and `src/data/manual-pdf.json` with your change. A test fails if the PDF is older than the page.

## Checks before you finish

- `npm run check`, `npm run build` and `npm run test:unit` are successful.
- Each slide is correct at 1920 × 1080. Look at a screenshot, not only at the code.
- `npm run test:e2e` is successful in all three browser engines.
- The browser console shows no errors.
- Commit messages follow Conventional Commits.
