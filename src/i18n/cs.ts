/**
 * Czech texts. The shape must match `en.ts`; the type check fails when a text is missing.
 * Non-breaking spaces come from `typeset()`. Do not add them by hand.
 */
import type { Dictionary } from './index.ts';

export const cs: Dictionary = {
  meta: {
    title: 'Fajnovka · věrnostní program MHD pro Ostravu',
    description: 'Fajnovka je návrh věrnostního programu pro MHD v Ostravě. Tříminutový pitch, MSIC LabZero.',
  },
  ui: {
    deck: 'Pitch Fajnovka',
    announce: 'Snímek %n z %total: %title',
    controls: 'Ovládání snímků',
    previous: 'Předchozí snímek',
    next: 'Další snímek',
    goTo: 'Přejít na snímek %n',
    pause: 'Zastavit animace',
    play: 'Spustit animace',
    fullscreen: 'Celá obrazovka',
    exitFullscreen: 'Ukončit celou obrazovku',
    language: 'Jazyk',
    notes: 'Text pro řečníka',
  },
  title: {
    slogan: 'Jezdi fajně. Žij Ostravou.',
    manual: 'Zobrazit kompletní manuál',
    live: 'Ostrava teď · vozů na trati: %vehicles · obsazeno míst: %share · DPO',
    snapshot: '%when · vozů na trati: %vehicles · obsazeno míst: %share · DPO',
    notes: 'Dobrý den. Jsme tým Fajnovka. Fajnovka je věrnostní program pro MHD v Ostravě.',
  },
  paradox: {
    title: ['Zastávka je blízko.', 'Místo ve voze je.', 'Přesto vítězí auto.'],
    residents: 'lidí bydlí do {walkMinutes} minut od zastávky',
    occupancy: 'míst obsazeno v páteční špičce',
    source: 'MAPPA · API DPO',
    notes:
      'Ostrava má dobrou MHD. {residentsNearStop} lidí bydlí do {walkMinutes} minut chůze od zastávky. V páteční špičce bylo obsazeno jen {peakOccupancy:percent} míst. Zastávka je blízko, místo ve voze je, a přesto vítězí auto.',
  },
  leak: {
    title: ['Každý rok ubude asi {yearlyDecline:percent} cestujících.', 'Malé kroky, velké změny.'],
    caption: 'držitelů dlouhodobé jízdenky ročně odejde',
    source: 'Výroční zprávy DPO {reportFrom:year}–{reportTo:year} · odhad z prodejů jízdenek DPO',
    notes:
      'Od roku {reportFrom:year} ztrácí ostravská MHD každý rok asi {yearlyDecline:percent} cestujících. Odhadujeme, že si každý rok neobnoví dlouhodobou jízdenku asi {nonRenewals} lidí. Aby se to zastavilo, stačí malé kroky.',
  },
  product: {
    title: ['Věrnostní program města', 'na kartě, kterou už máte.'],
    points: {
      levels: 'Úrovně za roky s jízdenkou',
      rewards: 'Odměny za fajnbody',
      discounts: 'Zážitky a akce se slevou',
      resume: 'Po pauze pokračujete tam, kde jste skončili',
    },
    card: { points: 'fajnbodů', level: 'Diamantová úroveň' },
    notes:
      'Fajnovka je věrnostní program města na ODISce, kterou lidé už mají. Za každý rok s jízdenkou máte vyšší úroveň. Sbíráte fajnbody a měníte je za odměny: zážitky a akce ve městě se slevou. A po pauze pokračujete tam, kde jste skončili.',
  },
  journey: {
    title: ['Výhoda přivede. Postup udrží.', 'Hrdost posílí vztah k městu.'],
    jakub: ['Stěhuje se do Ostravy', 'Zkušební měsíc', 'ZOO za polovinu', 'Roční jízdenka'],
    pavla: ['{pavlaYears} let s jízdenkou', 'Diamantová úroveň', 'Mění práci', 'Pauza bez ztráty úrovně'],
    end: 'Jezdí dál',
    notes:
      'Jakub se stěhuje do Ostravy. Dostane zkušební měsíc, potom ZOO za polovinu a koupí si roční jízdenku. Pavla má jízdenku {pavlaYears} let a diamantovou úroveň. Když změní práci, jízdenku pozastaví a úroveň jí zůstane. Oba jezdí dál.',
  },
  evidence: {
    title: ['Principy jsou ověřené.', 'Účinek v Ostravě změří pilot.'],
    items: {
      donors: {
        lead: 'Dárci krve',
        text: 'darují častěji, když se blíží k další medaili.',
        source: 'Lacetera a Macis 2010',
      },
      movers: {
        lead: 'V Kodani i Stuttgartu',
        text: 'zabrala jízdenka zdarma u lidí, kteří se právě stěhovali.',
        source: 'Thøgersen 2009, Bamberg 2006',
      },
      loyalty: {
        lead: '{loyaltyYears} let věrnostních programů',
        text: 'ukazuje malý, ale kladný vliv na věrnost.',
        source: 'Belli a kol. 2022',
      },
      odiska: {
        lead: 'ODISka',
        text: 'už v kraji zlevnila vstup na hrady a zámky až o polovinu.',
        source: 'S ODISkou na hrad, KODIS',
      },
    },
    notes:
      'Ty principy fungují. Dárci krve darují častěji, když se blíží k další medaili. V Kodani i ve Stuttgartu zabrala jízdenka zdarma u lidí, kteří se právě stěhovali. {loyaltyYears} let věrnostních programů ukazuje malý, ale kladný vliv. Účinek v Ostravě změří pilot.',
  },
  spread: {
    title: ['Fajnovka se k lidem dostane', 'přes lidi, kterým věří.'],
    items: {
      employers: {
        lead: 'Zaměstnavatelé',
        text: 'mohou dát Fajnovku jako benefit. Navrhujeme začít u zaměstnanců města.',
      },
      groups: {
        lead: 'Skupiny',
        text: 'sdílejí jednu Fajnovku: rodina i přátelé.',
      },
      ambassadors: {
        lead: 'Ambasadoři',
        text: 'jsou známé osobnosti z Ostravy. Dělají z MHD věc prestiže.',
      },
    },
    notes:
      'Lidé se mění kvůli lidem, kterým věří. Zaměstnavatelé mohou dát Fajnovku jako benefit a navrhujeme začít u zaměstnanců města. Rodina nebo přátelé mohou sdílet skupinovou Fajnovku. Ambasadoři, známé osobnosti z Ostravy, mohou z MHD udělat věc prestiže.',
  },
  economics: {
    title: ['Malý náklad,', 'který se do roku {paybackBase:year} vrátí.'],
    share: 'toho, co město ročně platí DPO: {programmeCost:mczk}',
    chart: 'Náklad na cestujícího za rok',
    rows: {
      return: 'Vrátit odešlého',
      keep: 'Udržet stálého',
      acquire: 'Získat nového z auta',
    },
    payback: 'rok návratnosti',
    scenario: 'Scénář',
    scenarios: { worse: 'horší', base: 'základní', better: 'lepší' },
    source: 'Odhad · Výroční zpráva DPO {reportTo:year}',
    notes:
      'Celý program stojí {programmeCost:mczk} ročně. To je {compensationShare:percent} toho, co město ročně platí DPO. Vrátit odešlého cestujícího stojí {costReturn:czk} ročně. Získat nového z auta stojí {costAcquire:czk}. V základním scénáři se program vrátí do roku {paybackBase:year}.',
  },
  ask: {
    title: ['Stačí data a jeden obvod.'],
    lead: 'A šest měsíců ukáže, zda Fajnovka přivádí a udržuje cestující.',
    steps: [
      { when: 'Jaro', what: 'výchozí měření' },
      { when: 'Září', what: 'start v Porubě' },
      { when: 'Každý měsíc', what: 'srovnání s Jihem' },
      { when: 'Únor', what: 'vyhodnocení' },
    ],
    decisions: ['Rozšířit', 'Upravit', 'Ukončit'],
    notes:
      'Žádáme dvě věci: data z ODIS a jeden městský obvod. Pilot trvá šest měsíců v Porubě, pro srovnání slouží Jih, a stojí {pilotCost:mczk}. Potom rozhodnou čísla: rozšířit, upravit, nebo ukončit. Malé kroky, velké změny. Děkujeme.',
  },
  manual: {
    title: 'Kompletní manuál',
    lead: 'Věrnostní program MHD pro Ostravu: zákazníci, odměny, důkazy, financování, pilot a zdroje.',
    description:
      'Kompletní manuál Fajnovky, návrhu věrnostního programu MHD pro Ostravu: zákazníci, odměny, důkazy, byznys model, pilot a zdroje.',
    contents: 'Obsah',
    download: 'Stáhnout jako PDF',
    pitch: 'Zpět na pitch',
    table: 'Tabulka: %title. Všechny sloupce zobrazíte posunem do strany.',
    figure: 'Graf: %title. Celý graf zobrazíte posunem do strany.',
    chart: {
      kinds: { line: 'Čárový graf', bars: 'Sloupcový graf', ranges: 'Graf rozpětí' },
      line: '%name: z hodnoty %from v roce %start na %to v roce %end',
      bar: '%name: %value',
      range: '%name: %mid, v rozpětí od %low do %high',
      year: 'Rok',
      total: 'Celkem',
      pandemic: 'pandemie',
      units: {
        passengers: 'mil. cestujících',
        people: 'lidí ročně',
        extra: 'cestující navíc',
        mczk: 'mil. Kč',
      },
      scenarios: { worse: 'Pesimistický', base: 'Základní', better: 'Optimistický' },
      revenue: { with: 'S Fajnovkou', without: 'Bez Fajnovky' },
      budget: { shared: 'Společné náklady' },
      region: {
        city: 'DPO a město',
        kodis: 'KODIS',
        partners: 'Partneři',
        cars: 'Ušetřené externí náklady aut',
      },
    },
  },
};
