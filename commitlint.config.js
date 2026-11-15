/**
 * Rules for commit messages: Conventional Commits (https://www.conventionalcommits.org).
 * A message of Dependabot can have long lines with links, so the length rules do not apply to it.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => message.includes('Signed-off-by: dependabot[bot]')],
};
