# Fajnovka pitch deck

Web presentation for the pitch of Fajnovka, a proposed public transport loyalty programme for Ostrava (MSIC LabZero 2026).

Live: <https://fajnovka.zezulka.me>

This is a proposal by a student team. It is not an official product of the City of Ostrava, DPO or KODIS.

## Present

| Action                 | Input                                               |
| ---------------------- | --------------------------------------------------- |
| Next slide             | `→` `↓` `Space` `Enter` `PageDown` (clicker)        |
| Previous slide         | `←` `↑` `Backspace` `PageUp` (clicker)              |
| Go to a slide          | `1`–`9`, `Home`, `End`, or a stop on the bottom line |
| Fullscreen             | `F`, or the button on the first slide               |
| Speaker text and timer | `N` (`R` resets the timer)                          |

On a touch screen, swipe left or right. The address keeps the slide number (`/#4`).

The page needs the network only for the first load. Open it before the pitch starts.

## Develop

```sh
npm install
npm run dev     # http://localhost:4321
npm run check   # types
npm run build   # static site in dist/
```

Node 22.23.4 or later is necessary (Astro 7).

## Structure

```text
src/
  pages/index.astro      page shell; the list of slides sets the order of the pitch
  slides/NN-Name.astro   one file per slide: text, speaker notes, layout, own script
  components/            Slide, Wordmark, Icon
  data/numbers.ts        every number in the deck, with its source
  scripts/deck.ts        navigation, fullscreen, speaker notes
  styles/global.css      design tokens, type styles, deck controls
```

## Change the content

- **Text:** edit the slide file. The `notes` attribute is the text that the speaker says.
- **Numbers:** edit `src/data/numbers.ts` only. The ids `K01`–`K20` refer to `klicova_cisla.csv` in the team's data pack.
- **Order:** change the `slides` list in `src/pages/index.astro`.
- **New slide:** copy a slide file, rename it, add it to the list. The progress line gets a new stop automatically.

## Design

- Colours and type follow the [City of Ostrava design manual](https://ostrava.cz/cs/o-meste/logo-mesta-ostravy/designmanual): `#00ADD0`, `#003C69`, white.
- Montserrat replaces Gotham, because Gotham needs a licence.
- The stage is always 192 × 108 rem. All sizes are in `rem`, so the deck looks the same on each screen.
- The `FAJNOVKA!!!` wordmark and the pictograms come from the team's graphic pack. The wordmark is a working proposal. The official `OSTRAVA!!!` logo is not used, because the city must approve each use.

The rules that keep the deck simple are in [`AGENTS.md`](AGENTS.md).

## Deploy

Vercel builds each push to `main` and serves it at the address above. The site is static. It has no analytics, and search engines are told not to index it.
