/**
 * Data behind the charts of the manual.
 * Sources: DPO annual reports 2010–2025 (history) and the financial model of the team
 * (Finance Canvas, sheet 8 "10-year plan"; Monte Carlo simulation; budget of year 1).
 * Everything except `passengersCarried` is a rough estimate.
 */

/** Passengers carried by DPO in a year, in thousands. Source: DPO annual reports. */
export const passengersCarried: readonly (readonly [year: number, thousands: number])[] = [
  [2010, 106327],
  [2011, 101924],
  [2012, 96389],
  [2013, 93476],
  [2014, 91000],
  [2015, 88159],
  [2016, 88518],
  [2017, 91150],
  [2018, 97648],
  [2019, 96129],
  [2020, 76509],
  [2021, 78897],
  [2022, 90143],
  [2023, 90091],
  [2024, 89892],
  [2025, 91242],
];

export const scenarios = ['worse', 'base', 'better'] as const;
export type Scenario = (typeof scenarios)[number];

/** One year of the ten-year model. Money is in CZK, prices of 2025. */
export interface ModelYear {
  year: number;
  /** People who ride in this year because of the programme. */
  extraPassengers: number;
  /** Revenue of DPO from long-term passes without the programme. */
  revenueWithout: number;
  /** Extra revenue of DPO because of the programme. */
  extraRevenue: number;
  /** Cost of the programme, with investment. */
  cost: number;
  /** Extra revenue of KODIS and the regional carriers. */
  kodis: number;
  /** Extra income of the reward partners. */
  partners: number;
  /** External costs of cars that the region saves. */
  externalities: number;
}

type Row = readonly [number, number, number, number, number, number, number, number];

const rows: Record<Scenario, readonly Row[]> = {
  worse: [
    [2027, 448, 269478989, 1075200, 15962000, 490000, 2420600, 1932000],
    [2028, 954, 266730303, 2588520, 11462000, 1043000, 3458000, 4112400],
    [2029, 1327, 264009654, 3841842, 11462000, 1481550, 3458000, 5673540],
    [2030, 1623, 261316756, 4837866, 11462000, 1854318, 3458000, 6874509],
    [2031, 1855, 258651325, 5622116, 13462000, 2171170, 3458000, 7781933],
    [2032, 2036, 256013081, 6232595, 11462000, 2440494, 3458000, 8451183],
    [2033, 2174, 253401748, 6700983, 11462000, 2669420, 3458000, 8928191],
    [2034, 2278, 250817050, 7053646, 11462000, 2864007, 3458000, 9250980],
    [2035, 2354, 248258716, 7312487, 13462000, 3029406, 3458000, 9450949],
    [2036, 2407, 245726477, 7495674, 11462000, 3169995, 3458000, 9553960],
  ],
  base: [
    [2027, 922, 269478989, 2464350, 14920000, 980000, 2420600, 3627750],
    [2028, 2002, 266730303, 5826562, 10420000, 2086000, 3458000, 7837688],
    [2029, 2876, 264009654, 8775028, 10420000, 2963100, 3458000, 11232534],
    [2030, 3620, 261316756, 11281224, 10420000, 3708635, 3458000, 14118154],
    [2031, 4252, 258651325, 13411490, 12420000, 4342340, 3458000, 16570931],
    [2032, 4789, 256013081, 15222217, 10420000, 4880989, 3458000, 18655791],
    [2033, 5246, 253401748, 16761334, 10420000, 5338840, 3458000, 20427923],
    [2034, 5634, 250817050, 18069584, 10420000, 5728014, 3458000, 21934234],
    [2035, 5964, 248258716, 19181597, 12420000, 6058812, 3458000, 23214599],
    [2036, 6244, 245726477, 20126807, 10420000, 6339990, 3458000, 24302909],
  ],
  better: [
    [2027, 1488, 269478989, 4075400, 14920000, 1715000, 2420600, 5722500],
    [2028, 3243, 266730303, 9595245, 10420000, 3650500, 3458000, 12412275],
    [2029, 4673, 264009654, 14419608, 10420000, 5185425, 3458000, 17829934],
    [2030, 5889, 261316756, 18520317, 10420000, 6490111, 3458000, 22434944],
    [2031, 6922, 258651325, 22005919, 12420000, 7599095, 3458000, 26349202],
    [2032, 7800, 256013081, 24968682, 10420000, 8541730, 3458000, 29676322],
    [2033, 8547, 253401748, 27487029, 10420000, 9342971, 3458000, 32504374],
    [2034, 9181, 250817050, 29627625, 10420000, 10024025, 3458000, 34908218],
    [2035, 9721, 248258716, 31447131, 12420000, 10602921, 3458000, 36951485],
    [2036, 10179, 245726477, 32993712, 10420000, 11094983, 3458000, 38688262],
  ],
};

const toYear = ([year, extraPassengers, revenueWithout, extraRevenue, cost, kodis, partners, externalities]: Row): ModelYear => ({
  year,
  extraPassengers,
  revenueWithout,
  extraRevenue,
  cost,
  kodis,
  partners,
  externalities,
});

export const tenYears: Record<Scenario, readonly ModelYear[]> = {
  worse: rows.worse.map(toYear),
  base: rows.base.map(toYear),
  better: rows.better.map(toYear),
};

/** A range of an estimate: 10th percentile, median, 90th percentile. */
export interface Range {
  low: number;
  mid: number;
  high: number;
}

/** Extra passengers a year because of the programme (Monte Carlo simulation and the register of assumptions). */
export const yearlyEffect = {
  acquired: { low: 280, mid: 410, high: 600 },
  kept: { low: 0, mid: 370, high: 735 },
  returned: { low: 360, mid: 540, high: 790 },
} as const satisfies Record<string, Range>;

/** Budget of the programme by purpose, CZK million a year. */
export const budget = {
  shared: 7.12,
  acquisition: 3.01,
  loyalty: 1.27,
  winBack: 0.17,
} as const;
