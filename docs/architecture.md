# Architecture

The site is a set of static pages with one small server function. [Astro](https://astro.build) builds the pages. The browser gets plain HTML, CSS and a small amount of TypeScript, with no UI framework.

## The parts

| Part | Job | Where |
| --- | --- | --- |
| Deck | The pitch: nine slides on one page | `src/pages/index.astro`, `src/pages/cs/index.astro` |
| Manual | The full proposal: one page and one PDF for each language | `src/pages/manual/`, `src/pages/cs/manual/`, `public/manual/` |
| Files for programs | The same content for AI agents | `src/pages/llms.txt.ts`, `manual.md.ts`, `openapi.json.ts`, `.well-known/` |
| Server function | One reading of how full the vehicles of DPO are | `api/occupancy.ts` |

English is the default language and has no prefix. Czech is at `/cs/`. Each page has the same structure in the two languages.

## One source for each thing

Each fact of the site has one home. All other places read it from there.

| Thing                                     | Home                                              |
| ----------------------------------------- | ------------------------------------------------- |
| A number of the deck, with its source     | `src/data/numbers.ts`                             |
| A text of the deck, and the speaker notes | `src/i18n/en.ts`, `src/i18n/cs.ts`                |
| A chapter of the manual                   | `src/content/manual/<language>/<order>-<name>.md` |
| The data of a chart                       | `src/data/model.ts`                               |
| The tram scene: lines, stops and trams    | `src/data/scene.ts`                               |
| A colour, a font, a line weight           | `src/styles/tokens.css`                           |
| The address of the site                   | `src/data/site.ts`                                |

A text refers to a number as `{key}` or `{key:format}`. `src/lib/format.ts` puts the number in, in the format of the language. `src/lib/typeset.ts` then adds the non-breaking spaces.

## The deck

`src/components/Deck.astro` holds the list of slides: the list sets the order of the pitch. Each slide is one file in `src/slides/` with its layout, its styles and its script.

All nine slides are in the page from the start. The first slide is visible in the HTML, so the page shows content before a script runs. The scripts in `src/scripts/deck/` then make the page a deck.

| File            | Job                                                                      |
| --------------- | ------------------------------------------------------------------------ |
| `deck.ts`       | Shows one slide, keeps the slide number in the address, sends the events |
| `input.ts`      | Keys, clicker, swipe, and the pointer that rests                         |
| `motion.ts`     | The switch that pauses all loops                                         |
| `scene.ts`      | Starts and stops the script of a slide                                   |
| `notes.ts`      | The speaker text and the timer                                           |
| `fullscreen.ts` | Full screen, and a screen that stays awake                               |
| `live.ts`       | Asks the server function for the reading of DPO                          |
| `tools.ts`      | The tools of the deck for an AI agent                                    |

A slide never calls the deck. It listens to events: `slide:enter` and `slide:leave` on the slide, `deck:change` and `deck:motion` on the deck. Thus the order of the scripts on the page does not matter.

## The tram scene

The first slide shows two tram lines. The scene has three layers.

1. `src/data/scene.ts` gives the lines, the stops and the trams for each layout.
2. `src/lib/scene.ts` turns them into time intervals: when a tram moves, when a passenger waits, boards and leaves.
3. `src/scripts/scenes/title.ts` turns the intervals into animations of the browser.

The first two layers are pure functions with unit tests. `src/lib/path.ts` gives the geometry of a line as numbers, so the script asks the browser for no layout work. The script builds the scene in three short tasks, so the page stays free for the visitor.

Only `transform` and `opacity` change, so the browser can run the scene off the main thread. With reduced motion, the scene shows one still picture: a tram at the stop where the two lines meet.

The trams are about as full as the real vehicles of DPO at this minute. The page asks its own server function, never a third party. If the function does not answer, the scene uses a stored reading.

## The manual

1. A chapter is one Markdown file for each language. `src/content.config.ts` checks its title and its place.
2. The Markdown processor uses `src/lib/markdown.ts`. The plugin sets the typography, draws the charts and puts each table in a frame.
3. `src/lib/figures.ts` draws a chart as SVG from the data in `src/data/model.ts` and `src/data/numbers.ts`.
4. `src/components/Manual.astro` builds the page: cover, contents and chapters.
5. `npm run manual:pdf` prints the page of each language to a PDF in `public/manual/`.

The PDF script prints each language two times. The first print shows on which page each chapter starts. The second print has these page numbers in the contents.

The script also stores a signature of the printed page in `src/data/manual-pdf.json`. A browser test compares the signature with the page of today. Thus nobody can change the manual and forget the PDF.

## The files for programs

`src/lib/agents.ts` and `src/lib/tools.ts` make all files for AI agents from the same texts and data as the pages. A program never gets a second copy of a text that a person wrote by hand.

| File                          | Content                                         |
| ----------------------------- | ----------------------------------------------- |
| `/llms.txt`                   | A guide to the site                             |
| `/manual.md`, `/cs/manual.md` | The manual as one Markdown text                 |
| `/openapi.json`               | The description of the server function          |
| `/.well-known/ard.json`       | The catalogue of these resources                |
| JSON-LD in each page          | What the page is                                |
| WebMCP tools                  | Actions on the page for an agent in the browser |

## The server function

`api/occupancy.ts` runs at Vercel in Frankfurt (`fra1`). It asks the public dashboard of DPO for the list of vehicles and keeps only four sums. It has no parameters, and it reads nothing from the request.

The content network keeps each answer for one minute, so the dashboard of DPO gets one request in a minute at most. If the dashboard does not answer, the function gives the stored reading from `src/data/occupancy.ts`.

## Security and privacy

- The site sets no cookie, has no analytics and loads nothing from another site.
- Each page has a content policy with a hash for each script and each style of the build. `astro.config.ts` sets it.
- `vercel.json` adds the headers that a page cannot set: no frames, HTTPS only, no referrer, no access to sensors.
- People and programs can read each page, but the server tells search engines not to list the site.

A static host cannot make a header with hashes for each page, so the policy is in the page.

## Build and deploy

Vercel builds each push to the `main` branch and serves the result. `vercel.json` sets `PUBLIC_LIVE_DATA`, so the deck on the live site asks the server function. A build without this setting makes a deck that uses the stored reading only.

`npm run build:test` makes the site for the browser tests. In that build, the deck asks for live data, and each test gives the answer.
