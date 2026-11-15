# Design system

The design has few parts. Each part has one rule and one reason. Where a program can check a rule, a test does that: the last section gives the test for each rule.

The short form of these rules, for daily work, is in [`AGENTS.md`](../AGENTS.md).

## Colours

The colours come from the [design manual of the City of Ostrava](https://ostrava.cz/cs/o-meste/logo-mesta-ostravy/designmanual). `src/styles/tokens.css` is the only file with colour values.

| Token     | Value     | Name               |
| --------- | --------- | ------------------ |
| `--cyan`  | `#00ADD0` | Ostrava light blue |
| `--navy`  | `#003C69` | Ostrava dark blue  |
| `--white` | `#FFFFFF` | White              |

A style does not use these tokens. It uses a role, and a theme gives each role its colour. A slide, a card or the manual sets its theme with `data-theme`.

| Role       | Job                                    | `cyan` theme | `white` theme | `navy` theme |
| ---------- | -------------------------------------- | ------------ | ------------- | ------------ |
| `--bg`     | Background                             | cyan         | white         | navy         |
| `--fg`     | Text and lines                         | navy         | navy          | white        |
| `--accent` | The one thing that the eye must find   | white        | cyan          | cyan         |
| `--soft`   | Quiet lines: 18 % of the colour `--fg` | navy, light  | navy, light   | white, light |

Contrast decides where a colour can be. Navy on white is 11.4:1, navy on cyan is 4.3:1, and white on cyan is 2.7:1. Thus the cyan theme holds only text of title size and navy shapes. Cyan is never the colour of text on white. White on cyan is for large shapes only, such as the wordmark.

## Type

The family is Montserrat. The design manual of the city uses Gotham, but Gotham needs a licence. The site hosts the font files itself, in two parts: basic Latin, and Latin Extended for the Czech letters.

The deck has four type classes, in `src/styles/type.css`. A slide uses four text sizes at most: a title, one hero, body text and small text.

| Class     | Stage   | Column  | Weight | Job                                     |
| --------- | ------- | ------- | ------ | --------------------------------------- |
| `t-title` | 8.8 rem | 8.4 rem | 900    | The sentence that gives the point       |
| `t-hero`  | 20 rem  | 17 rem  | 900    | One number. A slide can make it smaller |
| `t-body`  | 3.6 rem | 4.4 rem | 600    | All other text                          |
| `t-small` | 2.4 rem | 3.4 rem | 600    | The source line and small labels        |

Body text is never smaller than 12 px, and small text is never smaller than 10 px. Text inside a mock-up, such as the card on slide 4, can have its own size.

The manual has its own four sizes in `src/styles/manual.css`: `--title`, `--heading`, `--text` and `--small`. Its unit is the font size that the reader has set in the browser.

## Layout

A slide has two layouts. `src/styles/media.css` decides which one a screen gets.

| Layout | Screen | Slide |
| --- | --- | --- |
| Stage | A wide screen in landscape format | One fixed picture of 192 × 108 rem |
| Column | A screen in portrait format, or a narrow, zoomed window | A column of 108 rem that scrolls if it is too long |

On the stage, 1 rem is 1/192 of the width of the screen or 1/108 of its height: the smaller of the two. All sizes are in `rem`, so the full picture grows and shrinks as one piece. A figure that must scale as one piece, such as the tram scene, uses `em` inside.

The margins of a slide are tokens: `--pad-x`, `--pad-top` and `--pad-bottom`. On the stage, text stays inside the screen and above the control bar.

## The line with stops

The deck has one graphic device: a line with stops, as on a map of a tram network. It shows progress, a journey or a timeline. Do not add a second device.

- The control bar is a line with nine stops, one for each slide.
- The tram scene of the first slide is two lines with stops.
- The contents and the charts of the manual use the same line.

A shape that moves on a line has a ring in the colour `--bg`. The ring keeps the shape apart from a line of the same colour.

## Pictograms

`src/components/Icon.astro` holds all pictograms. Each one is a drawing on a grid of 100 × 100 units.

- All lines are 5 units wide, with round ends and round corners.
- Accent shapes come first in the drawing, then the lines. An accent shape never covers a line.
- An accent shape stops 3 units before a line, or it goes under the line and ends there.
- The drawing sits in the centre of the grid.

## Wordmark

`src/components/Wordmark.astro` holds the `FAJNOVKA!!!` wordmark as shapes, not as text. It is a working proposal of the team. The site does not use the official `OSTRAVA!!!` logo, because the city must approve each use.

No two letters touch. The pairs AJ and KA have more space than in the graphic pack of the team.

## Motion

Motion shows order or change. It is never decoration.

- When the viewer must see how many things move, they move one at a time.
- An animation starts when its slide becomes active. It never needs a click.
- A loop runs until the visitor pauses it with the button or the key `P`.
- A person who asks the system for less motion gets each change at once. No transition runs, and each scene shows one still picture.
- The deck stays clear as a still picture.

The easing curves and the delay between two elements that enter a slide are tokens in `src/styles/tokens.css`.

## Controls

- A control is at least 24 px wide and 24 px high, on each screen.
- On the stage, the buttons leave the picture when the pointer rests for 2.5 seconds. The line with stops stays.
- Each action has a key. The arrow keys always go to the next and the previous slide.
- The keyboard focus has a clear ring.

## Charts of the manual

`src/lib/figures.ts` draws the charts when the site is built.

- A chart has one ink colour and direct labels. It has no legend box.
- The accent colour fills only a stop or a light wash.
- Each chart has a caption. A chart of values also has a table of the values for a screen reader.

## The tests that keep the rules

| Rule                                                                   | Test                               |
| ---------------------------------------------------------------------- | ---------------------------------- |
| Colour values only in `tokens.css`; sizes in `rem`                     | Stylelint (`npm run check:styles`) |
| Four text sizes at most; text on the screen and apart; one source line | `tests/e2e/design.spec.ts`         |
| Rules of the pictograms; space between the letters of the wordmark     | `tests/e2e/design.spec.ts`         |
| The ring of the trams; passengers move one at a time                   | `tests/e2e/scene.spec.ts`          |
| No transition with reduced motion; the pause button                    | `tests/e2e/controls.spec.ts`       |
| Contrast, names, size of controls (WCAG 2.2 AA)                        | `tests/e2e/accessibility.spec.ts`  |
| The picture of each slide                                              | `tests/e2e/visual.spec.ts`         |
| Each number of the deck is in `numbers.ts`                             | `tests/unit/texts.test.ts`         |
