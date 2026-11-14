/**
 * Every number the deck shows lives here, once.
 * K-ids point to 03_data/klicova_cisla.csv in the team's data pack (version 1.0, 14 Nov 2026).
 * kind: "fact" has a public source, "estimate" is the team's model, "proposal" is a design choice.
 */

export const numbers = {
  /** MAPPA, "Doprava v Ostravě": residents within a 5-minute walk of a stop. */
  residentsNearStop: 258_764,
  /** DPO vehicle API, one snapshot, Fri 13 Nov 2026 16:38: share of technical capacity in use. */
  peakOccupancyPercent: 12,
  /** Estimate: 15 % of about 80 000 holders of a long-term ticket do not renew each year. */
  nonRenewalsPerYear: 12_000,

  /** K02: yearly cost of the city-wide programme, CZK million. */
  programmeCostMillion: 11.6,
  /** K03: K02 as a share of the city's yearly compensation to DPO (CZK 2 087 million). */
  compensationSharePercent: 0.55,
  /** K11–K13: cost of one net passenger-year, CZK. */
  costPerPassengerYear: { return: 95, loyalty: 510, acquisition: 2220 },
  /** K17: year in which the programme pays back; null means not within the 10-year model. */
  paybackYear: { pessimistic: null, base: 2034, optimistic: 2030 },

  /** K04: six-month pilot in Poruba, CZK million. */
  pilotCostMillion: 3.4,
  /** Proposal: points in the "O auto méně" family package. */
  familyPackagePoints: 1000,
} as const;

const czech = new Intl.NumberFormat('cs-CZ');

/** Formats a number the Czech way: decimal comma, non-breaking space between thousands. */
export function cs(value: number): string {
  return czech.format(value);
}
