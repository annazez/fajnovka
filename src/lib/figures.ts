/**
 * The charts of the manual, drawn as SVG when the site is built.
 *
 * All charts use the same few marks: a line with stops, a bar and a light wash.
 * Marks have one ink colour. The accent colour only fills a stop or a wash, because it is too light to stand alone.
 * Each chart labels its values directly, so it has no legend box and stays clear in black-and-white print.
 */
import {
  budget,
  passengersCarried,
  scenarios,
  tenYears,
  yearlyEffect,
  type ModelYear,
  type Scenario,
} from '../data/model.ts';
import { numbers } from '../data/numbers.ts';
import { useDictionary } from '../i18n/index.ts';
import type { Locale } from '../i18n/locales.ts';
import { format, formatNumber, insert } from './format.ts';
import { need } from './need.ts';
import { element, join, text, type Markup } from './svg.ts';

export const figureIds = [
  'passengers',
  'estimates',
  'budget',
  'levers',
  'revenue',
  'passengers-extra',
  'payback',
  'region',
] as const;
export type FigureId = (typeof figureIds)[number];

/** The values of a chart as a table. */
export interface FigureTable {
  head: readonly string[];
  rows: readonly (readonly string[])[];
}

export interface Figure {
  /** The chart as one SVG element. */
  svg: Markup;
  /** For a reader who cannot see the chart. Only when the text near the chart does not give the values. */
  table?: FigureTable;
}

type Point = readonly [x: number, y: number];
type Scale = (value: number) => number;
type Anchor = 'start' | 'middle' | 'end';
type Chart = ReturnType<typeof useDictionary>['manual']['chart'];

interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Width of each chart in its own units. The page scales the chart to the width of the text. */
const WIDTH = 680;
/** Size of the text in the units of the chart: 8.5pt on an A4 page. */
const FONT_SIZE = 12;
const MINUS = '−';
const MILLION = 1_000_000;

const round = (value: number): number => Math.round(value * 10) / 10;

function linear([fromValue, toValue]: Point, [fromPosition, toPosition]: Point): Scale {
  return (value) => round(fromPosition + ((value - fromValue) / (toValue - fromValue)) * (toPosition - fromPosition));
}

/** A number with a plus or minus sign, for a gain or a loss. */
export function signed(value: number, locale: Locale): string {
  const sign = value < 0 ? MINUS : '+';
  return sign + formatNumber(Math.abs(value), locale);
}

// Marks

function frame(height: number, summary: string, ...children: readonly Markup[]): Markup {
  return element(
    'svg',
    { class: 'chart', viewBox: `0 0 ${WIDTH} ${height}`, 'font-size': FONT_SIZE, role: 'img', 'aria-label': summary },
    ...children,
  );
}

function label(x: number, y: number, value: string, anchor: Anchor = 'start', kind = ''): Markup {
  const names = ['chart__label', kind && `chart__label--${kind}`].filter(Boolean).join(' ');
  return element('text', { class: names, x, y, 'text-anchor': anchor }, text(value));
}

function line(points: readonly Point[], kind = ''): Markup {
  const d = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join('');
  return element('path', { class: kind ? `chart__line chart__line--${kind}` : 'chart__line', d });
}

/** The area between two lines. */
function wash(upper: readonly Point[], lower: readonly Point[]): Markup {
  const outline = [...upper, ...lower.toReversed()];
  return element('path', {
    class: 'chart__wash',
    d: outline.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join('') + 'Z',
  });
}

/** A stop on a line. The larger invisible circle makes the tooltip easy to reach. */
function stop([x, y]: Point, title: string, main = false): Markup {
  return element(
    'g',
    {},
    element('title', {}, text(title)),
    element('circle', { class: 'chart__hit', cx: x, cy: y, r: 12 }),
    element('circle', { class: main ? 'chart__stop chart__stop--main' : 'chart__stop', cx: x, cy: y, r: main ? 6 : 4 }),
  );
}

/** A bar that starts at `from` and ends at `to`. The end with the value is round, the end at the baseline is square. */
function bar(from: number, to: number, y: number, height: number, title: string): Markup {
  const length = Math.abs(to - from);
  const radius = Math.min(4, length / 2, height / 2);
  const direction = to >= from ? 1 : -1;
  const d = [
    `M${from} ${y}`,
    `H${round(to - direction * radius)}`,
    `a${radius} ${radius} 0 0 ${direction === 1 ? 1 : 0} ${direction * radius} ${radius}`,
    `v${round(height - 2 * radius)}`,
    `a${radius} ${radius} 0 0 ${direction === 1 ? 1 : 0} ${-direction * radius} ${radius}`,
    `H${from}Z`,
  ].join('');
  return element('path', { class: 'chart__bar', d }, element('title', {}, text(title)));
}

/** Horizontal grid lines with their values on the left. The line at zero is stronger. */
function valueAxis(plot: Plot, y: Scale, ticks: readonly number[], show: (tick: number) => string): Markup {
  return join(
    ...ticks.map((tick) =>
      join(
        element('path', {
          class: tick === 0 ? 'chart__grid chart__grid--zero' : 'chart__grid',
          d: `M${plot.left} ${y(tick)}H${plot.right}`,
        }),
        label(plot.left - 8, y(tick) + 4, show(tick), 'end', 'tick'),
      ),
    ),
  );
}

function yearAxis(plot: Plot, x: Scale, years: readonly number[]): Markup {
  return join(...years.map((year) => label(x(year), plot.bottom + 22, String(year), 'middle', 'tick')));
}

/** The name of a line and its last value, to the right of the last point. */
function endLabel([x, y]: Point, name: string, value: string): Markup {
  return join(label(x + 14, y - 2, name), label(x + 14, y + 13, value, 'start', 'strong'));
}

// Sentences for a reader who cannot see the chart

interface Series {
  name: string;
  values: readonly (readonly [year: number, value: number])[];
  show: (value: number) => string;
}

/** The first and the last item of a list. An empty list is a fault in the data. */
function ends<T>(list: readonly T[], what: string): readonly [first: T, last: T] {
  return [need(list[0], what), need(list.at(-1), what)];
}

function lineSummary(t: Chart, series: readonly Series[]): string {
  const parts = series.map(({ name, values, show }) => {
    const [first, last] = ends(values, `A value of the series "${name}"`);
    return insert(t.line, {
      name,
      from: show(first[1]),
      start: String(first[0]),
      to: show(last[1]),
      end: String(last[0]),
    });
  });
  return `${t.kinds.line}. ${parts.join('; ')}.`;
}

function barSummary(t: Chart, items: readonly { name: string; shown: string }[]): string {
  return `${t.kinds.bars}. ${items.map(({ name, shown }) => insert(t.bar, { name, value: shown })).join('; ')}.`;
}

function yearTable(t: Chart, series: readonly Series[]): FigureTable {
  const first = need(series[0], 'A series for the table');
  return {
    head: [t.year, ...series.map(({ name }) => name)],
    rows: first.values.map(([year], index) => [
      String(year),
      ...series.map(({ name, values, show }) =>
        show(need(values[index], `The year ${year} of the series "${name}"`)[1]),
      ),
    ]),
  };
}

// Charts

function passengers(locale: Locale): Figure {
  const t = useDictionary(locale).manual.chart;
  const plot: Plot = { left: 48, right: 660, top: 34, bottom: 258 };
  const values = passengersCarried.map(([year, thousands]) => [year, thousands / 1000] as const);
  const [first, last] = ends(values, 'A year of the passenger series');
  const lowest = values.reduce((low, value) => (value[1] < low[1] ? value : low));

  const show = (value: number): string => formatNumber(round(value), locale);
  const x = linear([first[0], last[0]], [plot.left + 16, plot.right - 16]);
  const y = linear([70, 110], [plot.bottom, plot.top]);
  const at = ([year, value]: readonly [number, number]): Point => [x(year), y(value)];
  const series: Series = { name: t.units.passengers, values, show };
  const [lowX, lowY] = at(lowest);

  return {
    svg: frame(
      290,
      lineSummary(t, [series]),
      label(0, 14, t.units.passengers, 'start', 'tick'),
      valueAxis(plot, y, [70, 80, 90, 100, 110], (tick) => formatNumber(tick, locale)),
      yearAxis(plot, x, [2010, 2015, 2020, 2025]),
      line(values.map(at)),
      ...values.map((value) =>
        stop(at(value), `${value[0]}: ${show(value[1])} ${t.units.passengers}`, value === first || value === last),
      ),
      label(at(first)[0] + 12, at(first)[1] - 6, show(first[1]), 'start', 'strong'),
      label(at(last)[0], at(last)[1] - 14, show(last[1]), 'middle', 'strong'),
      label(lowX, lowY + 21, show(lowest[1]), 'middle', 'strong'),
      label(lowX, lowY + 35, t.pandemic, 'middle', 'tick'),
    ),
    table: yearTable(t, [series]),
  };
}

function estimates(locale: Locale): Figure {
  const dictionary = useDictionary(locale);
  const t = dictionary.manual.chart;
  const names = dictionary.economics.rows;
  const rows = [
    { name: names.acquire, range: yearlyEffect.acquired },
    { name: names.keep, range: yearlyEffect.kept },
    { name: names.return, range: yearlyEffect.returned },
  ];
  const plot: Plot = { left: 232, right: 648, top: 34, bottom: 190 };
  const x = linear([0, 800], [plot.left, plot.right]);
  const show = (value: number): string => formatNumber(value, locale);
  const summary = rows.map(({ name, range }) =>
    insert(t.range, { name, mid: show(range.mid), low: show(range.low), high: show(range.high) }),
  );

  return {
    svg: frame(
      214,
      `${t.kinds.ranges}. ${summary.join('; ')}.`,
      label(plot.left, 14, t.units.people, 'start', 'tick'),
      ...[0, 200, 400, 600, 800].map((tick) =>
        join(
          element('path', {
            class: tick === 0 ? 'chart__grid chart__grid--zero' : 'chart__grid',
            d: `M${x(tick)} ${plot.top}V${plot.bottom}`,
          }),
          label(x(tick), plot.bottom + 18, show(tick), 'middle', 'tick'),
        ),
      ),
      ...rows.map(({ name, range }, index) => {
        const y = plot.top + 26 + index * 52;
        return join(
          label(plot.left - 16, y + 4, name, 'end'),
          line([
            [x(range.low), y],
            [x(range.high), y],
          ]),
          stop([x(range.low), y], `${name}: ${show(range.low)}`),
          stop([x(range.high), y], `${name}: ${show(range.high)}`),
          stop([x(range.mid), y], `${name}: ${show(range.mid)}`, true),
          label(x(range.mid), y - 13, show(range.mid), 'middle', 'strong'),
          label(x(range.low), y + 20, show(range.low), 'middle', 'tick'),
          label(x(range.high), y + 20, show(range.high), 'middle', 'tick'),
        );
      }),
    ),
  };
}

/** Horizontal bars from one baseline, with the name on the left and the value after the bar. */
function ranked(t: Chart, items: readonly { name: string; value: number; shown: string }[]): Figure {
  const left = 232;
  const pitch = 34;
  const x = linear([0, Math.max(...items.map(({ value }) => value))], [left, left + 300]);

  return {
    svg: frame(
      8 + items.length * pitch,
      barSummary(t, items),
      ...items.map(({ name, value, shown }, index) => {
        const y = 8 + index * pitch;
        return join(
          label(left - 16, y + 14, name, 'end'),
          bar(left, x(value), y, 20, `${name}: ${shown}`),
          label(x(value) + 8, y + 14, shown, 'start', 'strong'),
        );
      }),
      element('path', { class: 'chart__grid chart__grid--zero', d: `M${left} 4V${4 + items.length * pitch - 6}` }),
    ),
  };
}

function budgetByPurpose(locale: Locale): Figure {
  const dictionary = useDictionary(locale);
  const names = dictionary.economics.rows;
  const total = Object.values(budget).reduce((sum, value) => sum + value, 0);
  const item = (name: string, value: number) => ({
    name,
    value,
    shown: `${formatNumber(value, locale)} · ${format(Math.round((value / total) * 100), 'percent', locale)}`,
  });
  return ranked(dictionary.manual.chart, [
    item(dictionary.manual.chart.budget.shared, budget.shared),
    item(names.acquire, budget.acquisition),
    item(names.keep, budget.loyalty),
    item(names.return, budget.winBack),
  ]);
}

function levers(locale: Locale): Figure {
  const dictionary = useDictionary(locale);
  const names = dictionary.economics.rows;
  const item = (name: string, value: number) => ({ name, value, shown: format(value, 'czk', locale) });
  return ranked(dictionary.manual.chart, [
    item(names.return, numbers.costReturn.value),
    item(names.keep, numbers.costKeep.value),
    item(names.acquire, numbers.costAcquire.value),
  ]);
}

const YEARS = [2027, 2030, 2033, 2036];
const TIME_PLOT: Plot = { left: 48, right: 540, top: 34, bottom: 258 };

function timeScale(model: readonly ModelYear[]): Scale {
  const [first, last] = ends(model, 'A year of the model');
  return linear([first.year, last.year], [TIME_PLOT.left + 12, TIME_PLOT.right]);
}

const lastPoint = (points: readonly Point[]): Point => need(points.at(-1), 'A point of the line');
/** The last year of a series and its value. */
const lastValue = ({ name, values }: Series): readonly [year: number, value: number] =>
  need(values.at(-1), `A value of the series "${name}"`);

function revenue(locale: Locale): Figure {
  const t = useDictionary(locale).manual.chart;
  const model = tenYears.base;
  const show = (value: number): string => formatNumber(Math.round(value), locale);
  const without: Series = {
    name: t.revenue.without,
    values: model.map((row) => [row.year, row.revenueWithout / MILLION]),
    show,
  };
  const withProgramme: Series = {
    name: t.revenue.with,
    values: model.map((row) => [row.year, (row.revenueWithout + row.extraRevenue) / MILLION]),
    show,
  };
  const x = timeScale(model);
  const y = linear([240, 275], [TIME_PLOT.bottom, TIME_PLOT.top]);
  const points = ({ values }: Series): Point[] => values.map(([year, value]) => [x(year), y(value)]);
  const upper = points(withProgramme);
  const lower = points(without);
  const ends = [withProgramme, without].map((series) => {
    const [year, value] = lastValue(series);
    return { series, title: `${year}, ${series.name}: ${show(value)} ${t.units.mczk}`, value: show(value) };
  });

  return {
    svg: frame(
      290,
      lineSummary(t, [withProgramme, without]),
      label(0, 14, t.units.mczk, 'start', 'tick'),
      valueAxis(TIME_PLOT, y, [240, 250, 260, 270], (tick) => formatNumber(tick, locale)),
      yearAxis(TIME_PLOT, x, YEARS),
      wash(upper, lower),
      line(lower, 'quiet'),
      line(upper),
      ...ends.map(({ series, title, value }, index) => {
        const end = lastPoint(points(series));
        return join(stop(end, title, index === 0), endLabel(end, series.name, value));
      }),
    ),
    table: yearTable(t, [withProgramme, without]),
  };
}

/** One line for each scenario. The base scenario is the strong line, and a wash fills the range between the other two. */
function byScenario(
  locale: Locale,
  height: number,
  domain: Point,
  ticks: readonly number[],
  unit: string,
  value: (rows: readonly ModelYear[]) => readonly number[],
  show: (value: number) => string,
  mark: (scenario: Scenario, values: readonly number[]) => number | undefined = () => undefined,
): Figure {
  const t = useDictionary(locale).manual.chart;
  const plot: Plot = { ...TIME_PLOT, bottom: height - 32 };
  const x = timeScale(tenYears.base);
  const y = linear(domain, [plot.bottom, plot.top]);
  const all = scenarios.map((scenario) => {
    const numbersOfYear = value(tenYears[scenario]);
    const values = tenYears[scenario].map(
      (row, index) =>
        [row.year, need(numbersOfYear[index], `The year ${row.year} of the scenario "${scenario}"`)] as const,
    );
    const series: Series = { name: t.scenarios[scenario], values, show };
    return {
      scenario,
      series,
      points: values.map(([year, amount]): Point => [x(year), y(amount)]),
      marked: mark(scenario, numbersOfYear),
    };
  });
  const find = (scenario: Scenario) =>
    need(
      all.find((item) => item.scenario === scenario),
      `The scenario "${scenario}"`,
    );

  return {
    svg: frame(
      height,
      lineSummary(
        t,
        all.map(({ series }) => series),
      ),
      label(0, 14, unit, 'start', 'tick'),
      valueAxis(plot, y, ticks, show),
      yearAxis(plot, x, YEARS),
      wash(find('better').points, find('worse').points),
      ...all.map(({ scenario, points }) => line(points, scenario === 'base' ? 'strong' : 'thin')),
      ...all.map(({ series, points, scenario, marked }) => {
        const [year, amount] = lastValue(series);
        const end = lastPoint(points);
        const markedPoint = marked === undefined ? undefined : points[marked];
        const markedYear = marked === undefined ? undefined : series.values[marked]?.[0];
        return join(
          stop(end, `${year}, ${series.name}: ${show(amount)} ${unit}`, scenario === 'base'),
          endLabel(end, series.name, show(amount)),
          markedPoint && markedYear !== undefined
            ? join(
                stop(markedPoint, `${series.name}: ${markedYear}`, true),
                label(markedPoint[0] - 2, markedPoint[1] - 14, String(markedYear), 'end', 'strong'),
              )
            : text(''),
        );
      }),
    ),
    table: yearTable(
      t,
      all.map(({ series }) => series),
    ),
  };
}

/** Sum of the yearly net benefit for DPO and the city up to each year, in CZK million. */
export function cumulativeBenefit(rows: readonly ModelYear[]): number[] {
  let sum = 0;
  return rows.map((row) => (sum += (row.extraRevenue - row.cost) / MILLION));
}

/** The first year in which the programme has paid back, or `undefined` if it does not pay back in the model. */
export function paybackYear(scenario: Scenario): number | undefined {
  const index = cumulativeBenefit(tenYears[scenario]).findIndex((sum) => sum >= 0);
  return tenYears[scenario][index]?.year;
}

function passengersExtra(locale: Locale): Figure {
  const hundreds = (value: number): string => formatNumber(Math.round(value / 100) * 100, locale);
  return byScenario(
    locale,
    290,
    [0, 12_000],
    [0, 4000, 8000, 12_000],
    useDictionary(locale).manual.chart.units.extra,
    (rows) => rows.map((row) => row.extraPassengers),
    hundreds,
  );
}

function payback(locale: Locale): Figure {
  const t = useDictionary(locale).manual.chart;
  return byScenario(
    locale,
    320,
    [-80, 120],
    [-50, 0, 50, 100],
    t.units.mczk,
    cumulativeBenefit,
    (value) => (Math.round(value) === 0 ? '0' : signed(Math.round(value), locale)),
    (_, sums) => {
      const index = sums.findIndex((sum) => sum >= 0);
      return index === -1 ? undefined : index;
    },
  );
}

/** Sums of the ten years for one scenario, in CZK million: the four parts of the benefit for the region. */
export function regionBenefit(scenario: Scenario): {
  city: number;
  kodis: number;
  partners: number;
  cars: number;
  total: number;
} {
  const sum = (pick: (row: ModelYear) => number): number =>
    tenYears[scenario].reduce((total, row) => total + pick(row), 0) / MILLION;
  const parts = {
    city: sum((row) => row.extraRevenue - row.cost),
    kodis: sum((row) => row.kodis),
    partners: sum((row) => row.partners),
    cars: sum((row) => row.externalities),
  };
  return { ...parts, total: parts.city + parts.kodis + parts.partners + parts.cars };
}

function region(locale: Locale): Figure {
  const t = useDictionary(locale).manual.chart;
  const left = 240;
  const x = linear([-80, 270], [left, 610]);
  const pitch = 22;
  const group = 130;
  const show = (value: number): string => signed(Math.round(value), locale);
  const parts = ['city', 'kodis', 'partners', 'cars'] as const;
  const groups = scenarios.map((scenario) => ({ name: t.scenarios[scenario], benefit: regionBenefit(scenario) }));
  const summary = groups.flatMap(({ name, benefit }) => [
    ...parts.map((part) => ({ name: `${name}, ${t.region[part]}`, shown: show(benefit[part]) })),
    { name: `${name}, ${t.total}`, shown: show(benefit.total) },
  ]);

  return {
    svg: frame(
      groups.length * group - 12,
      barSummary(t, summary),
      ...groups.map(({ name, benefit }, index) => {
        const top = index * group;
        return join(
          label(0, top + 13, name, 'start', 'strong'),
          label(WIDTH - 32, top + 13, `${t.total} ${show(benefit.total)}`, 'end', 'strong'),
          ...parts.map((part, row) => {
            const y = top + 26 + row * pitch;
            const value = benefit[part];
            const end = x(value);
            return join(
              label(left - 34, y + 11, t.region[part], 'end'),
              bar(x(0), end, y, 14, `${name}, ${t.region[part]}: ${show(value)} ${t.units.mczk}`),
              value < 0
                ? label(end - 6, y + 11, show(value), 'end', 'strong')
                : label(end + 6, y + 11, show(value), 'start', 'strong'),
            );
          }),
          element('path', {
            class: 'chart__grid chart__grid--zero',
            d: `M${x(0)} ${top + 22}V${top + 26 + parts.length * pitch - 4}`,
          }),
        );
      }),
    ),
  };
}

const charts: Record<FigureId, (locale: Locale) => Figure> = {
  passengers,
  estimates,
  budget: budgetByPurpose,
  levers,
  revenue,
  'passengers-extra': passengersExtra,
  payback,
  region,
};

export function isFigureId(value: string): value is FigureId {
  return (figureIds as readonly string[]).includes(value);
}

export function drawFigure(id: FigureId, locale: Locale): Figure {
  return charts[id](locale);
}
