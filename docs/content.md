# Content

This document tells what the site says, to whom, and where each statement comes from.

## The readers

| Reader | What the reader has | What the site gives |
| --- | --- | --- |
| A member of the jury at the Demo Day | Three minutes, and no knowledge of the project | The deck, in English |
| A person at the city, DPO or KODIS | Time to check the details | The manual, in Czech or English, as a page and as a PDF |
| An AI agent | No eyes for the layout | The same content as text and data |

Write for the first reader. A label must be clear to a person who hears of the project for the first time. Do not use a term of the team.

## The story of the deck

Each slide gives one idea. Its title is the sentence that the jury must remember.

| Slide       | Idea                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| 1 Title     | Ride well. Live Ostrava.                                                                     |
| 2 Paradox   | The stop is near and the seats are free, but the car wins.                                   |
| 3 Leak      | Each year, about 1 % of the passengers leave.                                                |
| 4 Product   | A loyalty programme of the city, on the card that people have.                               |
| 5 Journey   | A perk brings a person in, progress keeps the person, and pride ties the person to the city. |
| 6 Evidence  | The principles have proof. A pilot in Ostrava tests them.                                    |
| 7 Spread    | Fajnovka reaches people through people whom they trust.                                      |
| 8 Economics | A small cost that pays back by 2034.                                                         |
| 9 Ask       | Data and one district are enough for a pilot of six months.                                  |

The speaker text of all slides fits in three minutes. A test counts its words.

## The rules for a statement

- Each number of the deck is in `src/data/numbers.ts`, with its kind and its source.
- A number has one of three kinds. A `fact` comes from a public source. An `estimate` comes from the model of the team. An `example` shows an idea in a mock-up or a story.
- The site labels an estimate as an estimate.
- The site does not invent a source, a partner or a result. A plan is a proposal, and the text says so.
- The site is the proposal of a student team. It is not an official product of the City of Ostrava, DPO or KODIS.

## The sources

The last chapter of the manual, [Sources](https://fajnovka.zezulka.me/manual/#sources), is the one list of sources. Each link in a chapter is also in that list: a test checks it. Do not keep a second list.

| Kind | Examples |
| --- | --- |
| Research | Studies of loyalty programmes, habits and incentives, each with a link to the paper |
| Programmes in other places | Bologna, Vienna, Singapore, Brussels, Czech Railways, the ODIS card |
| Ostrava and data | The annual reports of DPO for 2010 to 2025, the vehicle data of DPO, the MAPPA statistics, the survey of the city from 2023 |
| Models of the team | The financial model, the register of assumptions, the simulation of the ten years |

The data behind the charts of the manual are in `src/data/model.ts`. The key numbers of the model have the identifiers K01 to K20 in `src/data/numbers.ts`.

## The materials

| Material | Where it is | Note |
| --- | --- | --- |
| Colours and type | The design manual of the City of Ostrava | Montserrat replaces Gotham |
| Wordmark and pictograms | `src/components/Wordmark.astro`, `src/components/Icon.astro` | Drawn again from the graphic pack of the team |
| Live data of the vehicles | The public dashboard of DPO, through `api/occupancy.ts` | `/openapi.json` describes the answer |
| Stored reading of the vehicles | `src/data/occupancy.ts` | Friday 13 November 2026, 16:38 |
| Working documents of the team | The shared folder of the team | Private. The repository holds all that the site needs. |

## The two languages

- The pitch is in English, so the English text comes first. The Czech text follows it and has the same structure.
- A text of the deck is in `src/i18n/en.ts` and `src/i18n/cs.ts`. The types make sure that the two files have the same keys.
- A chapter of the manual has one file for each language. A test compares the blocks and the links of the two files.
- Code, comments and documents are in English.

## How to change the content

[`README.md`](../README.md) gives the steps for a text, a number, the order of the slides, a chapter and a chart. After a change of the manual, print the PDF again.
