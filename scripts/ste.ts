/**
 * Checks the documents of the repository against the writing rules of the project.
 * The rules are the part of ASD-STE100 (Simplified Technical English) that a program can check.
 * `docs/writing.md` gives the rules with examples.
 *
 * Use: `node scripts/ste.ts` checks all documents. `node scripts/ste.ts FILE...` checks the given files.
 */
import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

/** The documents that follow the rules. Texts of other authors (the licences, the code of conduct) do not. */
export const DOCUMENTS = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/**/*.md',
  '.github/pull_request_template.md',
];

/** The most words in a sentence that tells the reader what to do (a step of a list), and in each other sentence. */
export const MAX_WORDS = { instruction: 20, description: 25 } as const;
export const MAX_SENTENCES = 6;

/**
 * Words that the documents do not use, each with the advice for the writer.
 * A word that has two or more meanings, or a long word for a simple idea, makes a text harder for a reader
 * whose first language is not English.
 */
export const WORDS: readonly (readonly [pattern: RegExp, advice: string])[] = [
  [/\butili[sz]e[sd]?\b/gi, 'Use "use".'],
  [/\bin order to\b/gi, 'Use "to".'],
  [/\bvia\b/gi, 'Use "through".'],
  [/\bprior to\b/gi, 'Use "before".'],
  [/\bin case\b/gi, 'Use "if".'],
  [/\bwhether\b/gi, 'Use "if".'],
  [/\bhowever\b/gi, 'Use "but".'],
  [/\bshould\b/gi, 'Use "must" for a rule, or "we recommend".'],
  [/\bshall\b/gi, 'Use "must".'],
  [/\b(may|might)\b/gi, 'Use "can", or "it is possible that".'],
  [/\b(would|could)\b/gi, 'Use "can", or the simple present.'],
  [/\b(need|needs|have|has) to\b/gi, 'Use "must".'],
  [/\bensure[sd]?\b/gi, 'Use "make sure".'],
  [/\ballow(s|ed|ing)?\b/gi, 'Use "let" or "permit".'],
  [/\b(simply|just|very|really|quite|basically|actually|obviously)\b/gi, 'Delete the word.'],
  [/\b(etc\.?|and so on)(?=\W|$)/gi, 'Give the full list, or use "for example".'],
  [/\be\.g\./gi, 'Use "for example".'],
  [/\bi\.e\./gi, 'Use "that is".'],
  [/\bplease\b/gi, 'Delete the word and give the instruction.'],
];

const CONTRACTION = /\b[A-Za-z]+(n't|'re|'ve|'ll|'d|'m)\b|\b(it|that|there|what|let|here)'s\b/gi;
/** `is running`, `are changing`: STE uses the simple present. Some -ing words are adjectives, not verb forms. */
const PROGRESSIVE = /\b(?:am|is|are|was|were|be|been)\s+(\w+ing)\b/gi;
const ADJECTIVES = new Set(['missing']);
/** `is made`, `are sent`: a step of a procedure names who does the action. */
const PASSIVE =
  /\b(?:is|are|was|were|be|been|being)\s+(?:\w+ed|built|done|given|kept|made|sent|set|shown|taken|written|found|held|run|put|read)\b/gi;

export interface Problem {
  /** Line of the document, from 1. */
  line: number;
  rule: 'sentence' | 'paragraph' | 'word' | 'contraction' | 'tense' | 'passive';
  message: string;
}

interface Block {
  line: number;
  text: string;
  /** A step of a numbered list: an instruction. */
  step: boolean;
  /** A heading or a table cell: a label, not a sentence. */
  label: boolean;
}

/** Text without Markdown: code, links and addresses become one word each, so they do not count as many words. */
export function plain(text: string): string {
  return text
    .replace(/<!--.*?-->/g, ' ')
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<https?:[^>]*>|https?:\/\/\S+/g, 'LINK')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The blocks of a Markdown document: paragraphs, list items, headings and table cells. Code blocks are not text. */
function blocks(markdown: string): Block[] {
  const result: Block[] = [];
  let fence = false;
  let paragraph: Block | undefined;

  markdown.split('\n').forEach((raw, index) => {
    const line = index + 1;
    if (/^\s*(```|~~~)/.test(raw)) {
      fence = !fence;
      paragraph = undefined;
      return;
    }
    if (fence || raw.trim() === '' || /^\s*(<!--.*-->|---+|\|[\s|:-]+\|)\s*$/.test(raw)) {
      paragraph = undefined;
      return;
    }

    const heading = /^#{1,6}\s+(.*)$/.exec(raw);
    const item = /^\s*(?:([-*+])|(\d+)[.)])\s+(?:\[[ x]\]\s+)?(.*)$/.exec(raw);
    if (heading) {
      result.push({ line, text: heading[1] ?? '', step: false, label: true });
      paragraph = undefined;
    } else if (raw.trim().startsWith('|')) {
      for (const cell of raw.split('|').slice(1, -1)) result.push({ line, text: cell, step: false, label: true });
      paragraph = undefined;
    } else if (item) {
      paragraph = { line, text: item[3] ?? '', step: item[2] !== undefined, label: false };
      result.push(paragraph);
    } else if (paragraph) {
      // A line that continues the paragraph or the list item above it.
      paragraph.text += ` ${raw.trim()}`;
    } else {
      paragraph = { line, text: raw.replace(/^>\s?/, ''), step: false, label: false };
      result.push(paragraph);
    }
  });
  return result;
}

/** A sentence ends at a full stop, a question mark, an exclamation mark, or a colon that starts a list. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"“(])|(?<=:)\s*$/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== '');
}

/** The words of a sentence. A number, a code term and a link are one word each. A symbol is not a word. */
export function words(sentence: string): string[] {
  return sentence.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
}

/** The problems of one Markdown document. */
export function check(markdown: string): Problem[] {
  const problems: Problem[] = [];

  for (const { line, text, step, label } of blocks(markdown)) {
    const clean = plain(text);
    const list = sentences(clean);

    // The faults of the words, in the order of the text.
    const faults: { at: number; rule: Problem['rule']; message: string }[] = [];
    const note = (found: RegExpExecArray, rule: Problem['rule'], message: string): void => {
      faults.push({ at: found.index, rule, message });
    };
    for (const found of clean.matchAll(CONTRACTION)) note(found, 'contraction', `Write "${found[0]}" as full words.`);
    for (const [pattern, advice] of WORDS) {
      for (const found of clean.matchAll(pattern)) note(found, 'word', `Do not use "${found[0]}". ${advice}`);
    }
    for (const found of clean.matchAll(PROGRESSIVE)) {
      if (ADJECTIVES.has((found[1] ?? '').toLowerCase())) continue;
      note(found, 'tense', `Use the simple present, not "${found[0]}".`);
    }
    for (const found of step ? clean.matchAll(PASSIVE) : []) {
      note(found, 'passive', `In a step, say who does the action, not "${found[0]}".`);
    }
    faults.sort((a, b) => a.at - b.at);
    for (const { rule, message } of faults) problems.push({ line, rule, message });
    if (label) continue;

    const limit = step ? MAX_WORDS.instruction : MAX_WORDS.description;
    for (const sentence of list) {
      const count = words(sentence).length;
      if (count > limit) {
        const start = words(sentence).slice(0, 6).join(' ');
        problems.push({
          line,
          rule: 'sentence',
          message: `A sentence has ${count} words. The limit is ${limit}: "${start} ..."`,
        });
      }
    }
    if (list.length > MAX_SENTENCES) {
      problems.push({
        line,
        rule: 'paragraph',
        message: `A paragraph has ${list.length} sentences. The limit is ${MAX_SENTENCES}.`,
      });
    }
  }
  return problems;
}

/** Checks the files and prints each problem as `file:line  rule  message`. Gives the number of problems. */
export async function run(patterns: readonly string[], print: (line: string) => void): Promise<number> {
  let total = 0;
  const files: string[] = [];
  for (const pattern of patterns) for await (const file of glob(pattern)) files.push(file);

  for (const file of files.sort()) {
    for (const { line, rule, message } of check(readFileSync(file, 'utf8'))) {
      print(`${file}:${line}  ${rule}  ${message}`);
      total += 1;
    }
  }
  const count = (number: number, thing: string): string => `${number} ${thing}${number === 1 ? '' : 's'}`;
  print(`Writing rules: ${count(files.length, 'document')}, ${count(total, 'problem')}.`);
  return total;
}

if (import.meta.main) {
  const patterns = process.argv.slice(2);
  process.exitCode = (await run(patterns.length > 0 ? patterns : DOCUMENTS, console.log)) === 0 ? 0 : 1;
}
