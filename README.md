# Fajnovka: pitch deck and manual

Web presentation for the pitch of Fajnovka, a proposed public transport loyalty programme for Ostrava (MSIC LabZero 2026), and the full manual of the proposal.

- Deck: <https://fajnovka.zezulka.me> (English), <https://fajnovka.zezulka.me/cs/> (Czech)
- Manual: <https://fajnovka.zezulka.me/manual/> (English), <https://fajnovka.zezulka.me/cs/manual/> (Czech), each with a PDF

This is a proposal by a student team. It is not an official product of the City of Ostrava, DPO or KODIS.

## Present

| Action                 | Input                                                         |
| ---------------------- | ------------------------------------------------------------- |
| Next slide             | `→` `↓` `Space` `Enter` `PageDown` (clicker)                  |
| Previous slide         | `←` `↑` `Backspace` `PageUp` (clicker)                        |
| Go to a slide          | `1`–`9`, `Home`, `End`, or a stop on the bottom line          |
| Full screen            | `F`, or the button at the bottom right                        |
| Pause the animations   | `P`, or the button at the bottom right                        |
| Speaker text and timer | `N` (`R` resets the timer)                                    |
| The full manual        | The book in the left corner (it shows when the pointer moves) |
| Language               | The switch on the first slide (`/` English, `/cs/` Czech)     |

On a touch screen, swipe left or right. The address keeps the slide number (`/#4`).

The trams on the first slide are about as full as the real vehicles of DPO at this minute. At a stop, the passengers leave the tram one at a time, and then the passengers at the stop board one at a time. The slide shows no numbers; `/api/occupancy` gives them. Without a connection, the slide uses a stored reading from Friday 13 November 2026.

The page needs the network only for the first load. Open it before the pitch starts.

## For AI agents

A program gets the same content as a person, in a form that it can read without the layout.

| What | Address |
| --- | --- |
| Guide to the site (llms.txt) | `/llms.txt` |
| The manual as one Markdown text | `/manual.md`, `/cs/manual.md` |
| Live data of DPO, and its description | `/api/occupancy`, `/openapi.json` |
| Catalogue of resources (ARD) | `/.well-known/ard.json`; `/.well-known/ai-catalog.json` is the older form |
| What each page is (JSON-LD) | a `script` element of the type `application/ld+json` in each page |
| Tools in the browser (WebMCP) | deck: `list_slides`, `go_to_slide`, `get_live_occupancy`; manual: `list_chapters`, `get_chapter` |

A browser gives the tools to its agent only if it has WebMCP (`document.modelContext`). In November 2026, Chrome has WebMCP as an origin trial: a site needs a token from Google, sent in the `Origin-Trial` header. This site has no token yet. Without WebMCP, the pages work as before.

## Develop

```sh
npm install
npm run dev        # http://localhost:4321
npm run check      # format, types, code, styles, writing rules and licences
npm run build      # static site in dist/
npm run test:unit  # tests of the pure code, the texts and the PDF files
npm run build:test # the same site for the browser tests: it asks for live data, and each test gives the answer
npm run test:e2e   # browser tests (Chromium, Firefox, WebKit); run build:test first
npm run test:lighthouse # Lighthouse scores of each page, as a phone and as a desktop computer
npm run manual:pdf # print the manual to public/manual/*.pdf
```

Node 22.23.4 or later is necessary (Astro 7).

## Structure

```text
src/
  pages/                   the deck and the manual, one page for each language; the files for AI agents
  components/Deck.astro    the list of slides sets the order of the pitch
  components/Manual.astro  cover, contents and chapters of the manual
  slides/NN-Name.astro     one file for each slide: layout, and its script if it has one
  content/manual/          the chapters of the manual, one Markdown file for each language
  i18n/en.ts, cs.ts        all texts of the deck, speaker notes, labels of the manual
  data/numbers.ts          every number in the deck, with its source
  data/model.ts            data behind the charts of the manual
  data/scene.ts            the tram scene of the title slide
  lib/                     pure functions (formats, typography, scene model, charts, Markdown rules)
  lib/agents.ts, tools.ts  what the site gives to AI agents: llms.txt, Markdown, catalogue, JSON-LD, tools
  scripts/                 deck engine and the scenes of the slides
  styles/                  design tokens, reset, deck styles, manual styles
api/occupancy.ts           server function: how full the vehicles of DPO are now
scripts/manual-pdf.ts      prints the manual to PDF
scripts/                   the checkers of the project, the Lighthouse run, the settings of the repository
public/manual/             the PDF files of the manual
docs/                      the documents of the project
tests/unit/                Vitest tests
tests/e2e/                 Playwright tests
.github/                   workflows, Dependabot, templates, the rule of the main branch
```

## Change the content

- **Text:** edit `src/i18n/en.ts` and `src/i18n/cs.ts`. `notes` is the text that the speaker says.
- **Numbers:** edit `src/data/numbers.ts` only. A text refers to a number as `{key}` or `{key:format}`.
- **Order:** change the `slides` list in `src/components/Deck.astro`.

## Change the manual

- **Text:** edit the chapter in `src/content/manual/en/` and the same chapter in `src/content/manual/cs/`. Keep the same headings, tables, lists and links in the two languages.
- **Chart:** write `![Caption.](figure:<name>)` on its own line. The charts are in `src/lib/figures.ts`.
- **PDF:** run `npm run manual:pdf`, then commit the two PDF files and `src/data/manual-pdf.json`.

## Design

- Colours and type follow the [City of Ostrava design manual](https://ostrava.cz/cs/o-meste/logo-mesta-ostravy/designmanual): `#00ADD0`, `#003C69`, white.
- Montserrat replaces Gotham, because Gotham needs a licence.
- Wide screens show a fixed 192 × 108 rem stage. Phones and zoomed windows show a 108 rem column that scrolls.
- The `FAJNOVKA!!!` wordmark and the pictograms come from the team's graphic pack. The wordmark is a working proposal. The official `OSTRAVA!!!` logo is not used, because the city must approve each use.

The rules that keep the deck simple are in [`AGENTS.md`](AGENTS.md).

## Documents

| Document                                         | Content                                                     |
| ------------------------------------------------ | ----------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                         | The rules of the project, for people and AI agents          |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)             | How to make a change                                        |
| [`docs/design-system.md`](docs/design-system.md) | Colours, type, layout, pictograms, motion                   |
| [`docs/architecture.md`](docs/architecture.md)   | The parts of the site and how they work together            |
| [`docs/content.md`](docs/content.md)             | The story, the sources and the materials                    |
| [`docs/quality.md`](docs/quality.md)             | The tests, the workflows and the settings of the repository |
| [`docs/writing.md`](docs/writing.md)             | The writing rules for documents and commit messages         |

## Deploy

Vercel builds each push to `main` and serves it at the address above. The site is static, with one server function in Frankfurt (`fra1`) that reads the public vehicle feed of DPO. The site has no analytics and no cookies. People and programs can read each page (`robots.txt` permits all), but each answer of the server tells search engines not to list it (`X-Robots-Tag: noindex, nofollow`).

## Licence

Copyright © 2026 Anna Zezulka, Richard Albrecht and Jakub Dedek.

- The program code and its documentation: Licensed under the EUPL (European Union Public Licence 1.2). See [`LICENCE.md`](LICENCE.md).
- The content (texts, manual, charts, pictures, wordmark): CC BY-NC-ND 4.0, with a wider permission for the City of Ostrava. See [`LICENCE-CONTENT.md`](LICENCE-CONTENT.md).

Report a security problem as [`SECURITY.md`](SECURITY.md) tells you. All persons who take part obey the [code of conduct](CODE_OF_CONDUCT.md).
