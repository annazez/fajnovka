#!/bin/sh
# Sets the rules of the GitHub repository. An administrator of the repository runs it one time:
#
#   gh auth login
#   sh scripts/repository-settings.sh
#
# The script is safe to run again: it changes the same settings to the same values.
set -eu

repo="annazez/fajnovka"

# Merges: only squash merges, the title of the pull request is the commit message, and a merged branch goes away.
# Auto-merge is possible: a pull request of Dependabot merges itself when the required checks pass.
gh api --silent -X PATCH "repos/$repo" \
  -F allow_auto_merge=true -F delete_branch_on_merge=true \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY

# Security: private reports of vulnerabilities, alerts of Dependabot, and a stop for a secret in a push.
gh api --silent -X PUT "repos/$repo/private-vulnerability-reporting"
gh api --silent -X PUT "repos/$repo/vulnerability-alerts"
gh api --silent -X PATCH "repos/$repo" --input - <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON

# The rule of the main branch (.github/rulesets/main.json): no deletion, no forced push, a straight history,
# and the checks `ci-ok` and `security-ok`. An administrator can go past the rule.
ruleset=$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "main") | .id')
if [ -n "$ruleset" ]; then
  gh api --silent -X PUT "repos/$repo/rulesets/$ruleset" --input .github/rulesets/main.json
else
  gh api --silent -X POST "repos/$repo/rulesets" --input .github/rulesets/main.json
fi

echo "The settings of $repo are in place."
