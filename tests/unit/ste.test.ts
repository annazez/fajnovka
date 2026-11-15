import { describe, expect, test } from 'vitest';

import {
  check,
  DOCUMENTS,
  MAX_SENTENCES,
  MAX_WORDS,
  plain,
  run,
  sentences,
  words,
  type Problem,
} from '../../scripts/ste.ts';

const rules = (markdown: string): Problem['rule'][] => check(markdown).map(({ rule }) => rule);
/** A sentence of a given number of words. */
const sentence = (count: number): string =>
  `${Array.from({ length: count }, (_, index) => (index === 0 ? 'Word0' : `word${index}`)).join(' ')}.`;

describe('writing rules: sentences', () => {
  test('a sentence of a paragraph has 25 words at most', () => {
    expect(MAX_WORDS.description).toBe(25);
    expect(check(sentence(25))).toEqual([]);
    expect(check(`${sentence(5)} ${sentence(26)}`)).toEqual([
      {
        line: 1,
        rule: 'sentence',
        message: 'A sentence has 26 words. The limit is 25: "Word0 word1 word2 word3 word4 word5 ..."',
      },
    ]);
  });

  test('a step of a numbered list has 20 words at most', () => {
    expect(MAX_WORDS.instruction).toBe(20);
    expect(check(`1. ${sentence(20)}`)).toEqual([]);
    expect(rules(`1. ${sentence(21)}`)).toEqual(['sentence']);
    // An item of a list without numbers is a description.
    expect(check(`- ${sentence(21)}`)).toEqual([]);
    expect(rules(`- [ ] ${sentence(26)}`)).toEqual(['sentence']);
  });

  test('a code term, a link and an address are one word each; a symbol is no word', () => {
    expect(
      words(plain('Run `npm run check` and read [the long name of the page](https://example.com/a/b) × 2 .')),
    ).toEqual(['Run', 'CODE', 'and', 'read', 'the', 'long', 'name', 'of', 'the', 'page', '2']);
    expect(words(plain('See <https://example.com/one/two> or https://example.com/three now'))).toEqual([
      'See',
      'LINK',
      'or',
      'LINK',
      'now',
    ]);
    expect(check(`${sentence(24).slice(0, -1)} \`a very long code term with many words in it\`.`)).toEqual([]);
  });

  test('a sentence ends at a full stop, a question mark, an exclamation mark, or a colon before a list', () => {
    expect(sentences('The stage is 192 × 108 rem. Is it wide? Yes! Version 1.2 is here.')).toEqual([
      'The stage is 192 × 108 rem.',
      'Is it wide?',
      'Yes!',
      'Version 1.2 is here.',
    ]);
    expect(sentences('Give this information:')).toEqual(['Give this information:']);
    expect(sentences('The file tokens.css has the colours.')).toHaveLength(1);
  });

  test(`a paragraph has ${MAX_SENTENCES} sentences at most`, () => {
    expect(check('One. Two. Three. Four. Five. Six.')).toEqual([]);
    expect(check('One. Two. Three. Four. Five. Six. Seven.')).toEqual([
      { line: 1, rule: 'paragraph', message: 'A paragraph has 7 sentences. The limit is 6.' },
    ]);
  });

  test('lines that continue a paragraph or an item belong to it, and the line of a problem is the first line', () => {
    const text = `Intro.\n\n${sentence(13).slice(0, -1)}\n${sentence(13)}\n\n1. Step one\n   ${sentence(20)}`;
    expect(check(text)).toMatchObject([
      { line: 3, rule: 'sentence' },
      { line: 6, rule: 'sentence' },
    ]);
  });
});

describe('writing rules: words', () => {
  test.each([
    ['You should utilize it.', ['should', 'utilize']],
    ['Do it in order to ensure quality.', ['in order to', 'ensure']],
    ['It may fail, however it might pass.', ['may', 'however', 'might']],
    ['We need to test it prior to the release.', ['need to', 'prior to']],
    ['This is very simple, etc.', ['very', 'etc.']],
    ['Please send it via e-mail, e.g. today.', ['Please', 'via', 'e.g.']],
    ['It would allow that, i.e. it could.', ['would', 'allow', 'i.e.', 'could']],
    ['Tell us whether it shall stay in case of rain.', ['whether', 'shall', 'in case']],
  ])('%s', (text, expected) => {
    const found = check(text).filter(({ rule }) => rule === 'word');
    expect(found.map(({ message }) => /"([^"]+)"/.exec(message)?.[1])).toEqual(expected);
    for (const { message } of found) expect(message).toMatch(/^Do not use "[^"]+"\. (Use|Delete|Give) /);
  });

  test('a contraction becomes full words', () => {
    expect(check("It's here and they don't see it.")).toEqual([
      { line: 1, rule: 'contraction', message: 'Write "It\'s" as full words.' },
      { line: 1, rule: 'contraction', message: 'Write "don\'t" as full words.' },
    ]);
    // The mark of possession is no contraction.
    expect(check("The tram's door and the passengers' seats.")).toEqual([]);
  });

  test('the simple present replaces a form with -ing', () => {
    expect(check('The tram is running and the doors are closing.')).toMatchObject([
      { rule: 'tense', message: 'Use the simple present, not "is running".' },
      { rule: 'tense', message: 'Use the simple present, not "are closing".' },
    ]);
    expect(check('A value is missing.')).toEqual([]);
  });

  test('a step names who does the action; a description can use the passive', () => {
    expect(check('1. The file is made by the tool.')).toEqual([
      { line: 1, rule: 'passive', message: 'In a step, say who does the action, not "is made".' },
    ]);
    expect(check('The content is licensed under CC BY-NC-ND.')).toEqual([]);
  });

  test('a heading and a table cell follow the word rules, but they are not sentences', () => {
    expect(rules(`# You should ${sentence(30)}`)).toEqual(['word']);
    expect(check(`| Name | Note |\n| --- | --- |\n| ${sentence(30)} | it's |`)).toEqual([
      { line: 3, rule: 'contraction', message: 'Write "it\'s" as full words.' },
    ]);
  });
});

describe('writing rules: what is not text', () => {
  test('code blocks, comments and rules between sections have no text to check', () => {
    const text = [
      '```sh',
      "it's very bad, etc.",
      '```',
      '',
      '<!-- you should not see this -->',
      '',
      '---',
      '',
      '~~~',
      'should',
      '~~~',
    ];
    expect(check(text.join('\n'))).toEqual([]);
  });

  test('code in a line and the address of a link are not text', () => {
    expect(check('Run `should --allow very` and open [the page](https://example.com/should/very).')).toEqual([]);
    expect(check('A quote: > is no problem.\n\n> This quote should change.')).toMatchObject([
      { line: 3, rule: 'word' },
    ]);
  });

  test('bold and italic text follows the rules', () => {
    expect(rules('This is **very** good and _should_ stay.')).toEqual(['word', 'word']);
  });
});

describe('writing rules: the documents of the repository', () => {
  test('the list names the documents of the project, not the texts of other authors', () => {
    expect(DOCUMENTS).toContain('README.md');
    expect(DOCUMENTS).toContain('AGENTS.md');
    expect(DOCUMENTS.join(' ')).not.toMatch(/LICENCE|CODE_OF_CONDUCT/);
  });

  test('each document obeys the rules', async () => {
    const lines: string[] = [];
    expect(await run(DOCUMENTS, (line) => lines.push(line)), lines.join('\n')).toBe(0);
    expect(lines.at(-1)).toMatch(/^Writing rules: \d+ documents, 0 problems\.$/);
  });

  test('the report gives the file, the line and the rule of each problem', async () => {
    const lines: string[] = [];
    expect(await run(['tests/unit/fixtures/ste-problem.md'], (line) => lines.push(line))).toBe(1);
    expect(lines).toEqual([
      'tests/unit/fixtures/ste-problem.md:3  word  Do not use "should". Use "must" for a rule, or "we recommend".',
      'Writing rules: 1 document, 1 problem.',
    ]);
  });
});
