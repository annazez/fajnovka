/**
 * English texts: the language of the pitch.
 * `{key}` and `{key:format}` insert a number from `src/data/numbers.ts`. Do not type numbers here.
 * `notes` is the text that the speaker says. All notes together must fit in three minutes.
 */
/** Lines of a title. Each language can break a title into a different number of lines. */
const lines = (...items: string[]): readonly string[] => items;

export const en = {
  meta: {
    title: 'Fajnovka · a loyalty programme for public transport in Ostrava',
    description:
      'Fajnovka is a proposal for a loyalty programme for public transport in Ostrava. Three-minute pitch, MSIC LabZero.',
  },
  ui: {
    deck: 'Fajnovka pitch',
    announce: 'Slide %n of %total: %title',
    controls: 'Slide controls',
    previous: 'Previous slide',
    next: 'Next slide',
    goTo: 'Go to slide %n',
    pause: 'Pause the animations',
    play: 'Play the animations',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    language: 'Language',
    notes: 'Speaker text',
  },
  title: {
    slogan: 'Ride well. Live Ostrava.',
    manual: 'Read the full manual',
    live: 'Ostrava now · vehicles on the road: %vehicles · places taken: %share · DPO',
    snapshot: '%when · vehicles on the road: %vehicles · places taken: %share · DPO',
    notes:
      'Good afternoon. We are the Fajnovka team. Fajnovka is a loyalty programme for public transport in Ostrava.',
  },
  paradox: {
    title: lines('The stop is near.', 'The seats are free.', 'Still, the car wins.'),
    residents: 'people live within a {walkMinutes}-minute walk of a stop',
    occupancy: 'of capacity used in rush hour',
    source: 'MAPPA · DPO API',
    notes:
      'Ostrava has good public transport. {residentsNearStop} people live within a {walkMinutes}-minute walk of a stop. In the Friday rush hour, only {peakOccupancy:percent} of the capacity was in use. The stop is near, the seats are free, and still, the car wins.',
  },
  leak: {
    title: lines('Each year, about {yearlyDecline:percent} of riders leave.', 'Small steps, big changes.'),
    caption: 'holders of a long-term pass leave each year',
    source: 'DPO annual reports {reportFrom:year}–{reportTo:year} · estimate from DPO ticket sales',
    notes:
      'Since {reportFrom:year}, public transport in Ostrava has lost about {yearlyDecline:percent} of its riders each year. We estimate that about {nonRenewals} holders of a long-term pass do not renew it each year. To stop this, small steps are enough.',
  },
  product: {
    title: lines('A city loyalty programme', 'on the card you already have.'),
    points: {
      levels: 'Levels for your years with a pass',
      rewards: 'Rewards for fajnpoints',
      discounts: 'Experiences and events at a discount',
      resume: 'After a break, you continue where you stopped',
    },
    card: { points: 'fajnpoints', level: 'Diamond level' },
    notes:
      'Fajnovka is a city loyalty programme on the ODISka card that people already have. You get a higher level for each year with a pass. You collect fajnpoints and exchange them for rewards: experiences and events in the city at a discount. After a break, you continue where you stopped.',
  },
  journey: {
    title: lines('A perk brings you in.', 'Progress keeps you.', 'Pride ties you to the city.'),
    jakub: ['Moves to Ostrava', 'Trial month', 'ZOO at half price', 'Annual pass'],
    pavla: ['{pavlaYears} years with a pass', 'Diamond level', 'Changes her job', 'Pauses the pass, keeps the level'],
    end: 'Keep riding',
    notes:
      'Jakub moves to Ostrava. He gets a trial month, then the zoo at half price, and he buys an annual pass. Pavla has had a pass for {pavlaYears} years and has the Diamond level. When she changes her job, she pauses her pass and keeps her level. They both keep riding.',
  },
  evidence: {
    title: lines('The principles are proven.', 'The pilot in Ostrava will test them.'),
    items: {
      donors: {
        lead: 'Blood donors',
        text: 'give more often when the next medal is near.',
        source: 'Lacetera and Macis 2010',
      },
      movers: {
        lead: 'In Copenhagen and Stuttgart,',
        text: 'a free ticket worked for people who had just moved.',
        source: 'Thøgersen 2009, Bamberg 2006',
      },
      loyalty: {
        lead: '{loyaltyYears} years of loyalty programmes',
        text: 'show a small but positive effect.',
        source: 'Belli et al. 2022',
      },
      odiska: {
        lead: 'The ODISka card',
        text: 'already cut the entry price of castles in the region by up to half.',
        source: 'S ODISkou na hrad, KODIS',
      },
    },
    notes:
      'These principles work. Blood donors give more often when the next medal is near. In Copenhagen and Stuttgart, a free ticket worked for people who had just moved. {loyaltyYears} years of loyalty programmes show a small but positive effect. The pilot in Ostrava will test them.',
  },
  spread: {
    title: lines('Fajnovka reaches people', 'through people they trust.'),
    items: {
      employers: {
        lead: 'Employers',
        text: 'can give Fajnovka as a benefit. We propose to start with the employees of the city.',
      },
      groups: {
        lead: 'Groups',
        text: 'share one Fajnovka: a family or friends.',
      },
      ambassadors: {
        lead: 'Ambassadors',
        text: 'are well-known people from Ostrava. They make public transport a proud choice.',
      },
    },
    notes:
      'People change because of people they trust. Employers can give Fajnovka as a benefit, and we propose to start with the employees of the city. A family or friends can share a group Fajnovka. Ambassadors, well-known people from Ostrava, can make public transport a proud choice.',
  },
  economics: {
    title: lines('A small cost', 'that pays back by {paybackBase:year}.'),
    share: 'of what the city pays DPO each year: {programmeCost:mczk}',
    chart: 'Cost per passenger per year',
    rows: {
      return: 'Win back a former rider',
      keep: 'Keep a regular rider',
      acquire: 'Win a new rider from a car',
    },
    payback: 'year of payback',
    scenario: 'Scenario',
    scenarios: { worse: 'worse', base: 'base', better: 'better' },
    source: 'Estimate · DPO annual report {reportTo:year}',
    notes:
      'The programme costs {programmeCost:mczk} a year. That is {compensationShare:percent} of what the city pays DPO each year. To win back a former rider costs {costReturn:czk} a year. To win a new rider from a car costs {costAcquire:czk}. In the base scenario, the programme pays back by {paybackBase:year}.',
  },
  ask: {
    title: lines('Data and one district are enough.'),
    lead: 'Six months will show if Fajnovka brings passengers and keeps them.',
    steps: [
      { when: 'Spring', what: 'first measurement' },
      { when: 'September', what: 'start in Poruba' },
      { when: 'Each month', what: 'compare with Jih' },
      { when: 'February', what: 'evaluation' },
    ],
    decisions: ['Expand', 'Adjust', 'End'],
    notes:
      'We ask for two things: data from ODIS and one city district. The pilot takes six months in Poruba, with Jih for comparison, and costs {pilotCost:mczk}. Then the numbers decide: expand, adjust, or end. Small steps, big changes. Thank you.',
  },
  manual: {
    title: 'The full manual',
    lead: 'A loyalty programme for public transport in Ostrava: customers, rewards, evidence, financing, the pilot and sources.',
    description:
      'The full manual of Fajnovka, a proposal for a loyalty programme for public transport in Ostrava: customers, rewards, evidence, business model, pilot and sources.',
    contents: 'Contents',
    download: 'Download as PDF',
    pitch: 'Back to the pitch',
    table: 'Table: %title. Scroll sideways to see all columns.',
    figure: 'Figure: %title. Scroll sideways to see the full chart.',
    chart: {
      kinds: { line: 'Line chart', bars: 'Bar chart', ranges: 'Range chart' },
      line: '%name: from %from in %start to %to in %end',
      bar: '%name: %value',
      range: '%name: %mid, in a range from %low to %high',
      year: 'Year',
      total: 'Total',
      pandemic: 'pandemic',
      units: {
        passengers: 'million passengers',
        people: 'people a year',
        extra: 'extra passengers',
        mczk: 'CZK million',
      },
      scenarios: { worse: 'Pessimistic', base: 'Base', better: 'Optimistic' },
      revenue: { with: 'With Fajnovka', without: 'Without Fajnovka' },
      budget: { shared: 'Shared costs' },
      region: {
        city: 'DPO and the city',
        kodis: 'KODIS',
        partners: 'Partners',
        cars: 'Saved external costs of cars',
      },
    },
  },
} as const;
