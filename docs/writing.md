# Writing rules

The documents of this repository use Simplified Technical English (ASD-STE100). Many readers of the project do not have English as their first language. Short sentences with common words are clear to all of them, and to a program.

The rules apply to `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, the pull request template and each file in `docs/`. They also apply to comments in the code, but no program checks comments. The licences and the code of conduct are texts of other authors: they stay as they are.

## The rules that a program checks

`npm run check:text` runs `scripts/ste.ts`. It reports each problem with its file and line.

| Rule                                      | Limit or example                                   |
| ----------------------------------------- | -------------------------------------------------- |
| A sentence is short.                      | 25 words. In a numbered step: 20 words.            |
| A paragraph is short.                     | 6 sentences.                                       |
| A verb has no short form.                 | Write `do not`, not `don't`.                       |
| A verb is in the simple present.          | Write `the test runs`, not `the test is running`.  |
| A numbered step says who does the action. | Write `Run the command`, not `the command is run`. |
| A word has one meaning.                   | See the list below.                                |

A code term, a link and a number are one word each. A heading and a table cell are labels: they have no limit of length, but the word rules apply to them.

## The words that the documents do not use

| Do not write                                                                      | Write                           |
| --------------------------------------------------------------------------------- | ------------------------------- |
| `utilize`                                                                         | use                             |
| `in order to`                                                                     | to                              |
| `via`                                                                             | through                         |
| `prior to`                                                                        | before                          |
| `in case`, `whether`                                                              | if                              |
| `however`                                                                         | but                             |
| `should`, `shall`, `need to`, `have to`                                           | must, or "we recommend"         |
| `may`, `might`, `would`, `could`                                                  | can, or the simple present      |
| `ensure`                                                                          | make sure                       |
| `allow`                                                                           | let, or permit                  |
| `simply`, `just`, `very`, `really`, `quite`, `basically`, `actually`, `obviously` | no word                         |
| `etc.`, `and so on`                                                               | the full list, or "for example" |
| `e.g.`, `i.e.`                                                                    | "for example", "that is"        |
| `please`                                                                          | no word: give the instruction   |

## The rules that only a person can check

- One word for one thing. If the first paragraph says "slide", no other paragraph says "screen" or "page" for the same thing.
- Say what a thing does before you say how it does it.
- Give the reason for a rule. A reader obeys a rule that has a reason.
- Do not use a term of the team that a new reader cannot know. Explain it, or use common words.
- Write a date with the name of the month: 15 November 2026.

## The texts of the deck and the manual

The texts that a visitor reads are not technical documents. They follow the content rules in [`AGENTS.md`](../AGENTS.md), not the limits above. Two programs help the writer.

- `src/lib/typeset.ts` adds the non-breaking spaces. Do not type them.
- A unit test fails if a text of the deck has a number that is not in `src/data/numbers.ts`.

## Commit messages

A commit message follows [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`. The summary starts with a verb in the present tense and has no full stop. The body tells the reason for the change. `commitlint` checks each message in CI.

| Type                   | Use                                                     |
| ---------------------- | ------------------------------------------------------- |
| `feat`                 | A visitor or a program gets something new.              |
| `fix`                  | A fault goes away.                                      |
| `perf`                 | The same result comes faster.                           |
| `refactor`             | The code changes, the result does not.                  |
| `test`                 | Only tests change.                                      |
| `docs`                 | Only documents change.                                  |
| `ci`, `build`, `chore` | Workflows, the build, and other work on the repository. |
