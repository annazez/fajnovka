/**
 * Every number that the site shows lives here, once.
 * A text in `src/i18n` refers to a number as `{key}` or `{key:format}`; a test fails if a text contains another number.
 *
 * kind
 *   fact      a public source gives the value
 *   estimate  the team's model gives the value (ids K01–K20 refer to `klicova_cisla.csv`, version 1.0, 14 Nov 2026)
 *   example   an illustration in a mock-up or a customer story
 */

type Kind = 'fact' | 'estimate' | 'example';

interface Entry {
  readonly value: number;
  readonly kind: Kind;
  /** Where the value comes from, in a form that a reader can check. */
  readonly source: string;
}

const entry = (value: number, kind: Kind, source: string): Entry => ({ value, kind, source });

export const numbers = {
  // Slide 2: the paradox
  residentsNearStop: entry(258_764, 'fact', 'MAPPA, statistics "Doprava v Ostravě": residents within a 5-minute walk of a stop'),
  walkMinutes: entry(5, 'fact', 'MAPPA, statistics "Doprava v Ostravě"'),
  peakOccupancy: entry(12, 'fact', 'DPO vehicle API, one snapshot, Fri 13 Nov 2026 16:38: 2 908 passengers / 24 758 places'),

  // Slide 3: the leak
  yearlyDecline: entry(1, 'fact', 'DPO annual reports: 106.3 million passengers in 2010, 91.2 million in 2025, about -1 % each year'),
  passengersFirstYear: entry(106.3, 'fact', 'DPO annual report 2010, million passengers'),
  passengersLastYear: entry(91.2, 'fact', 'DPO annual report 2025, million passengers'),
  reportFrom: entry(2010, 'fact', 'First DPO annual report in the time series'),
  reportTo: entry(2025, 'fact', 'Last DPO annual report in the time series'),
  nonRenewals: entry(12_000, 'estimate', 'About 15 % of 80 000 to 85 000 holders of a long-term pass, from DPO ticket sales'),

  // Slides 4 and 5: product and customer stories
  cardPoints: entry(430, 'example', 'Points on the card mock-up'),
  pavlaYears: entry(15, 'example', 'Customer story'),

  // Slide 6: evidence
  loyaltyYears: entry(40, 'fact', 'Belli et al. 2022, title of the meta-analysis'),

  // Slide 8: economics
  programmeCost: entry(11.6, 'estimate', 'K02: yearly cost of the city-wide programme, CZK million (11.57)'),
  compensationShare: entry(0.55, 'estimate', 'K03: K02 as a share of the city compensation to DPO (CZK 2 087 million, annual report 2025)'),
  costReturn: entry(95, 'estimate', 'K11: cost of one net passenger-year, win-back'),
  costKeep: entry(510, 'estimate', 'K12: cost of one net passenger-year, loyalty'),
  costAcquire: entry(2220, 'estimate', 'K13: cost of one net passenger-year, acquisition'),
  paybackBetter: entry(2030, 'estimate', 'K17: year of payback, optimistic scenario'),
  paybackBase: entry(2034, 'estimate', 'K17: year of payback, base scenario'),
  paybackWorse: entry(2036, 'estimate', 'K17: pessimistic scenario, no payback before the end of the model in 2036'),

  // Slide 9: the pilot
  pilotMonths: entry(6, 'estimate', 'K04: length of the pilot'),
  pilotCost: entry(3.4, 'estimate', 'K04: six-month pilot in Poruba, CZK million (3.42)'),
} as const satisfies Record<string, Entry>;

export type NumberKey = keyof typeof numbers;
