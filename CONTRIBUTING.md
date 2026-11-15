# How to contribute

Thank you for your help. This guide applies to each person and to each AI agent that changes the repository.

## Before you start

1. Read [`README.md`](README.md): it tells what the site is and what each folder holds.
2. Read [`AGENTS.md`](AGENTS.md): it holds the rules of the project. They apply to all changes.
3. For a large change, open an issue first and tell what problem you want to solve.

The documents in [`docs/`](docs/) give the details.

| Document                                         | Content                                                     |
| ------------------------------------------------ | ----------------------------------------------------------- |
| [`docs/design-system.md`](docs/design-system.md) | Colours, type, layout, pictograms, motion                   |
| [`docs/architecture.md`](docs/architecture.md)   | The parts of the site and how they work together            |
| [`docs/content.md`](docs/content.md)             | The story, the sources and the materials                    |
| [`docs/quality.md`](docs/quality.md)             | The tests, the workflows and the settings of the repository |
| [`docs/writing.md`](docs/writing.md)             | The writing rules for documents and commit messages         |

## Set up

Node 22.23.4 or later is necessary.

```sh
npm install
npx playwright install chromium firefox webkit
npm run dev
```

## Make a change

1. Make a branch from `main`.
2. Make the smallest change that solves the problem.
3. Write the texts in English and in Czech.
4. Add or change a test if the change adds a rule or fixes a fault.
5. Run the checks of the next section.
6. Write each commit message as [`docs/writing.md`](docs/writing.md) tells you.
7. Open a pull request and fill in its template.

## Check your change

```sh
npm run check
npm run test:unit
npm run build:test
npm run test:e2e
npm run test:lighthouse
```

For a visible change, look at a screenshot of the stage at 1920 × 1080 and of a phone. For a change of the manual, run `npm run manual:pdf` and commit the PDF files.

If a check fails, repair the cause. Do not make a check weaker to make it pass.

## The pull request

- The checks `ci-ok` and `security-ok` must pass.
- The owner of the project approves each change of the rules and of the legal texts. [`CODEOWNERS`](.github/CODEOWNERS) lists these files.
- A maintainer merges the pull request as one commit. Its title becomes the commit message, so it follows Conventional Commits.

## Licence of your contribution

You keep the copyright of your contribution. You give it to the project under the same licences as the rest of the repository.

- Program code and documents: the European Union Public Licence 1.2 ([`LICENCE.md`](LICENCE.md)).
- Content: CC BY-NC-ND 4.0, with the additional permission for the City of Ostrava ([`LICENCE-CONTENT.md`](LICENCE-CONTENT.md)).

Contribute only work that you have the right to give. Name each source.

## Conduct and security

All persons who take part obey the [code of conduct](CODE_OF_CONDUCT.md). Do not report a security problem in a public issue: [`SECURITY.md`](SECURITY.md) tells you what to do.
