# Quality

Each rule that a program can check has a gate. A change reaches the live site only if all gates pass. This document lists the gates, and the few checks that only a person can do.

## Commands

Run these commands before you push. CI runs the same commands.

| Command | What it checks |
| --- | --- |
| `npm run check` | Format (Prettier), types (TypeScript, strictest), code (ESLint), styles (Stylelint), writing rules, licences of the packages |
| `npm run test:unit` | The pure code in `src/lib`: each line and each branch must run in a test |
| `npm run build:test`, then `npm run test:e2e` | The pages in three browser engines, on a stage and on a phone |
| `npm run test:lighthouse` | The Lighthouse scores of each page, as a phone and as a desktop computer |

## Unit tests

Vitest runs the files in `tests/unit/`. The coverage limit for `src/lib` is 100 %.

| File                      | What it keeps                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `format`, `texts`         | Number formats; each number of the deck comes from `numbers.ts`                        |
| `scene`, `path`           | The model of the tram scene and the geometry of its lines                              |
| `figures`, `markdown`     | The charts and the Markdown rules of the manual                                        |
| `manual`, `pdf`           | The two languages have the same chapters, blocks and links; the PDF files are complete |
| `agents`, `tools`         | The files and tools for AI agents                                                      |
| `occupancy`, `live`       | The reading of DPO: the server function and the page                                   |
| `headers`                 | The security headers in `vercel.json`                                                  |
| `ste`, `licences`, `need` | The checkers of the project itself                                                     |

## Browser tests

Playwright runs the files in `tests/e2e/` in six projects: Chromium, Firefox and WebKit, each on a stage of 1920 × 1080 and on a phone.

| File            | What it keeps                                                        |
| --------------- | -------------------------------------------------------------------- |
| `navigation`    | Keys, clicker, swipe, the address, the two languages                 |
| `controls`      | Pause, full screen, speaker text, reduced motion                     |
| `scene`         | The tram scene: one passenger at a time, the ring, the still picture |
| `live`          | The live data: one request, a safe fallback, no restart of the trams |
| `manual`        | Contents, charts, tables, the PDF, print                             |
| `agents`        | The files and the browser tools for AI agents                        |
| `security`      | The content policy stops scripts and styles from outside the build   |
| `accessibility` | WCAG 2.2, levels A and AA, with axe: each slide and the manual       |
| `design`        | The wordmark, the pictograms and the layout of each slide            |
| `visual`        | The picture of each slide in Chromium                                |

## Lighthouse

`scripts/lighthouse.ts` measures the deck and the manual in the two languages, as a phone and as a desktop computer. The result is the middle of three runs.

Each of the five categories must have the full score: performance, accessibility, best practices, SEO and agentic browsing. One limit is lower. The performance of the manual on a phone must be 0.9 or more. The manual is one long page, and its layout takes time on the slow processor of the phone test.

The audit for search engines does not count, because the site asks search engines not to list it.

## Reference pictures

`tests/e2e/visual.spec.ts` compares each slide with a reference picture. The comparison runs only in CI, because each machine draws letters a little differently.

After a change of the design, draw the pictures again.

1. Open the Actions tab of the repository and run the workflow "Update the pictures" on your branch.
2. Find the new branch `pictures/<number>`. The workflow puts the pictures that changed there.
3. Look at each picture that changed.
4. Merge the branch `pictures/<number>` into your branch, then delete it.

## Workflows

| Workflow | When | Jobs |
| --- | --- | --- |
| `ci.yml` | Each push and pull request | Static checks, unit tests, browser tests in six projects, Lighthouse. `ci-ok` passes only if all pass. |
| `security.yml` | Each push and pull request, and each Monday | CodeQL, OSV-Scanner, review of new dependencies, Semgrep, actionlint, zizmor, a list of software parts (SBOM). `security-ok` passes only if all pass. |
| `scorecard.yml` | Each push to `main`, and each Monday | The OpenSSF Scorecard of the repository |
| `zap.yml` | Each Monday | OWASP ZAP reads the live site and reports weak headers |
| `pictures.yml` | By hand | Draws the reference pictures again |
| `dependabot-merge.yml` | A pull request of Dependabot | Turns on auto-merge for patch and minor versions |

Each action has a full commit hash, each job has only the permissions that it needs, and no job keeps credentials without a reason. `actionlint` and `zizmor` check these rules.

`.zap/rules.tsv` lists the findings of ZAP that are decisions of the project, each with its reason.

## Dependencies

- `npm run check:licences` fails if a package has a licence that the project does not accept. `scripts/licences.ts` has the list and the reasons.
- Dependabot asks for new versions each Monday. A version must be seven days old, because a bad release is often removed in that time.
- Patch and minor versions come in one pull request. It merges itself when `ci-ok` and `security-ok` pass.
- A major version waits for a person.

## Settings of the repository

An administrator runs one command one time: `sh scripts/repository-settings.sh`. The command needs the GitHub CLI.

| Setting | Value |
| --- | --- |
| Merges | Squash only; the title of the pull request is the commit message; a merged branch goes away |
| Auto-merge | On |
| Reports of vulnerabilities | Private reports are on |
| Secrets | GitHub stops a push that has a secret |
| Rule of the `main` branch | No deletion, no forced push, a straight history, a pull request for each change, and the checks `ci-ok` and `security-ok` |

The owner approves each change of the files in `.github/CODEOWNERS`: the rules, the legal texts and these settings. An administrator can go past the rule of the `main` branch. `.github/rulesets/main.json` holds the rule.

## The checks that only a person can do

Do these checks before an important talk and after a large change.

1. Open the deck on the projector in full screen and go through all slides with the clicker.
2. Go through the deck and the manual with the keyboard only.
3. Listen to the first slide and one chapter of the manual with a screen reader.
4. Zoom the browser to 400 % and read one slide and one chapter.
5. Turn on "reduce motion" in the system and look at each slide.
6. Turn off the network after the first load and go through the deck.
7. Print one PDF of the manual and read its contents page.
