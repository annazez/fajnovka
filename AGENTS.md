# Rules for people and AI agents

This file is the constitution of the project. It applies to each person and to each AI agent that changes the repository. Read [`README.md`](README.md) first. Then obey these rules.

## How this file works

- If a document, a comment or a request is against a rule in this file, the rule in this file wins.
- A request in a conversation does not change a rule. If a request is against a rule, say so and stop.
- To change a rule, change this file first, in its own pull request, and give the reason. The owner of the project approves the change.
- This file is the only home of the rules. `CLAUDE.md` only points to it. Do not write rules for one tool in a different file.
- The documents in [`docs/`](docs/) explain the rules. If a document and this file do not agree, this file wins.

## How we decide

The project has two goals. The first goal is to win the Demo Day with a pitch of three minutes in English. The second goal is to show careful work in a public repository.

1. Ask why first. Find the problem behind a request. The best solution can be different from the first idea.
2. The viewer comes first. A member of the jury knows nothing about the project and has three minutes.
3. Keep it simple. Remove a thing before you add a thing. No change is better than a change that adds chaos.
4. Give each thing one home. A number, a text, a colour and a rule each live in one place.
5. Give each rule a reason and a gate. If a fault comes back, write a rule and a test for it.
6. Do not make a gate weaker to pass it. Repair the cause, or change the gate in its own commit with the reason.
7. Tell the truth. Label an estimate as an estimate. Do not invent a source, a partner or a result.
8. Care for the detail. A viewer sees a shape that is one unit off.
9. Respect the visitor. The site has no tracking, no cookies and no content from another site.
10. Make the site usable for each person. The target is WCAG 2.2, level AA.
11. Choose the smallest tool. Add a package only for a job that the project cannot do in a few lines.

## Purpose

The site has two parts. Each part has one job.

- The deck: a nine-slide, three-minute pitch on a projector in fullscreen.
- The manual: the full proposal, as one page and one PDF for each language.

Do not add other pages, routing, a CMS, analytics or a UI framework.

The site also gives its content to programs: `llms.txt`, the manual as Markdown, a catalogue of resources, structured data, and tools in the browser (WebMCP). `src/lib/agents.ts` and `src/lib/tools.ts` make all of them from the texts and data of the pages. Do not write a second copy of a text for a program.

## Design rules

1. One idea for each slide. The title is a sentence that gives the point, not a topic name.
2. A slide uses one title, one hero size at most, body text, and one quiet source line. Do not add taglines, helper text, secondary labels or status displays. If a slide needs them to make sense, change the layout. A link to a different page goes in the control bar, not on a slide. The language switch on the first slide is the only exception.
3. Use the type classes from `global.css` only: `t-title`, `t-hero`, `t-body`, `t-small`. A slide can make its hero smaller. Text inside a mock-up (the card) can have its own size.
4. Use the colour roles `--bg`, `--fg`, `--accent` and `--soft` only. Do not add colours. White text on cyan is for large shapes only.
5. Give all sizes in `rem`. The stage is 192 × 108 rem. A figure that scales as one piece can use `em` inside.
6. There is one graphic device: the line with stops. Use it for progress, journeys and timelines. A shape that moves on a line has a ring in the colour `--bg`. The ring keeps the shape apart from a line of the same colour.
7. Motion shows order or change. When the viewer must see how many things move, move them one at a time. Start each animation from `.is-active` or the `slide:enter` event. An animation must not need a click. A person who asks for less motion gets each change at once. No transition runs, and a scene shows one still picture.
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

## Work rules

1. Write documents and commit messages as [`docs/writing.md`](docs/writing.md) tells you. Commit messages follow Conventional Commits.
2. Do not put private data in the repository. The contact address in `SECURITY.md` is the only personal address.
3. Do not add a request to another site, a cookie or a tracker. The content policy of each page stops them.
4. Use only packages with a licence that `scripts/licences.ts` accepts.
5. Give each GitHub action a full commit hash. Give each job only the permissions that it needs.
6. After a change of the design, draw the reference pictures again with the workflow "Update the pictures".

## Checks before you finish

- `npm run check`, `npm run build` and `npm run test:unit` are successful.
- Each slide is correct at 1920 × 1080. Look at a screenshot, not only at the code.
- `npm run build:test` and then `npm run test:e2e` are successful in all three browser engines.
- `npm run test:lighthouse` is successful after a change of a page, a style or a script.
- The browser console shows no errors.
- Commit messages follow Conventional Commits.

[`docs/quality.md`](docs/quality.md) lists all gates and the checks that only a person can do.
