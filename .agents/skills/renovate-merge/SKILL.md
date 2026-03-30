---
name: renovate-merge
description: "Use this skill when asked to process, fix, and merge a batch of GitHub PRs on a repository. Covers: pulling the repo, checking out each PR branch via gh CLI, running npm install and npm run scripts to surface errors, fixing those errors, pushing back to the PR branch, checking CI status, and rebasing + merging each PR into main in a loop."
compatibility: "Any environment with git, gh CLI, and Node.js/npm installed"
requires: "gh CLI authenticated (gh auth login), git configured with push access to the repo"
---

# GitHub PR Batch Review & Merge Loop For Renovate PRs

## Why this skill exists

When multiple PRs are open on a repo and each may have broken dependencies or
failing scripts, you need a repeatable loop that:

1. Fetches the next open PR
2. Checks it out locally
3. Validates it (`npm install` + all `npm run` scripts)
4. Fixes any errors
5. Pushes the fix back to the PR branch
6. Waits for CI and then merges into `main`

This skill documents the exact commands and error-handling logic for that loop.

---

## Prerequisites

```bash
# Verify tools are available
git --version
gh --version
node --version
npm --version

# Ensure gh is authenticated
gh auth status

# Ensure you are inside the target repo directory before starting
pwd
git remote -v
```

---

## Step 0 — Pull and rebase main

Always start from a clean, up-to-date `main`:

```bash
git checkout main
git fetch origin
git pull --rebase origin main
```

If there are uncommitted local changes blocking the pull:

```bash
git stash
git pull --rebase origin main
git stash pop 
```

---

## Step 1 — List all open PRs

```bash
gh pr list --state open --json number,title,headRefName,author \
  --template '{{range .}}#{{.number}} {{.title}} (branch: {{.headRefName}}) by {{.author.login}}{{"\n"}}{{end}}'
```

Capture the numbers into a variable for the loop, filtering to only Renovate PRs (branches prefixed `renovate/`):

```bash
PR_NUMBERS=$(gh pr list --state open --json number,headRefName \
  --jq '[.[] | select(.headRefName | startswith("renovate/")) | .number] | sort | .[]')
echo "$PR_NUMBERS"
```

---

## Step 2 — Loop over each PR

```bash
for PR in $PR_NUMBERS; do
  echo "=========================================="
  echo "Processing PR #$PR"
  echo "=========================================="

  # --- 2a. Skip non-Renovate branches (safety check) ---
  BRANCH=$(gh pr view "$PR" --json headRefName --jq '.headRefName')
  if [[ "$BRANCH" != renovate/* ]]; then
    echo "PR #$PR branch '$BRANCH' is not a renovate/* branch — skipping"
    continue
  fi

  # --- 2b. Check out the PR branch locally ---
  gh pr checkout "$PR"

  # Confirm which branch you are on
  git branch --show-current

  # --- 2c. Rebase the PR branch on top of latest main ---
  git fetch origin main
  if ! git rebase origin/main; then
    echo "PR #$PR has rebase conflicts — skipping (resolve manually)"
    git rebase --abort
    git checkout main
    continue
  fi

  # --- 2d. Install dependencies ---
  npm install

  # --- 2e. Run all npm scripts and capture failures ---
  # Discover available scripts first
  node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts||{}).join('\n'))"

  # Run each script; stop and fix on first failure
  npm run build   2>&1 | tee /tmp/pr_build.log    || echo "BUILD FAILED — fix required"
  npm run lint    2>&1 | tee /tmp/pr_lint.log     || echo "LINT FAILED — fix required"
  npm run test    2>&1 | tee /tmp/pr_test.log     || echo "TEST FAILED — fix required"
  npm run typecheck 2>&1 | tee /tmp/pr_types.log  || echo "TYPECHECK FAILED — fix required"

  # Add any other scripts that exist in package.json here

  # --- 2f. Fix errors (see Fixing Errors section below) ---
  # ... make fixes ...

  # --- 2g. Commit and push fixes ---
  git add -A
  git commit -m "fix: resolve errors for PR #$PR" || echo "Nothing to commit"
  git push origin HEAD

  # --- 2h. Check CI status ---
  echo "Waiting for CI checks on PR #$PR ..."
  # --watch streams until all checks complete; exits non-zero if any check fails
  if ! gh pr checks "$PR" --watch; then
    echo "PR #$PR has failing CI checks — skipping merge"
    git checkout main
    continue
  fi

  # --- 2i. Rebase-merge into main ---
  gh pr merge "$PR" --rebase --delete-branch

  echo "PR #$PR merged and branch deleted."

  # Return to main and pull the merged changes before the next PR
  git checkout main
  git pull --rebase origin main

done

echo "All PRs processed."
```

---

## Fixing Errors

### npm install errors

| Symptom | Fix |
|---|---|
| `ERESOLVE` peer dep conflict | `npm install --legacy-peer-deps` |
| Missing lockfile | Delete `node_modules`, run `npm install` fresh |
| Engine mismatch (`engines` field) | `node --version` then align or add `--engine-strict false` |
| Private registry 401 | Check `.npmrc`, re-authenticate with `npm login` |

### Build errors

```bash
# Read the captured log
cat /tmp/pr_build.log

# Common patterns
# 1. Missing import / module not found → install the package
npm install <missing-package>

# 2. TypeScript errors → check tsconfig.json, fix type annotations in source

# 3. Path aliasing broken → check tsconfig paths and vite/webpack aliases
```

### Lint errors (auto-fixable)

```bash
# Auto-fix with eslint
npx eslint . --fix

# Auto-fix with prettier
npx prettier --write .

# Then re-run lint to see remaining manual fixes
npm run lint
```

### Test failures

```bash
# Run a single test file to narrow down
npx jest path/to/failing.test.ts --verbose

# Run tests in watch mode while you edit
npx jest --watch

# Update snapshots if the change is intentional
npx jest -u
```

### Rebase conflicts

```bash
# See which files conflict
git status

# Open each conflicted file, resolve <<<<< ===== >>>>> markers, then:
git add <resolved-file>
git rebase --continue

# To abort and start over:
git rebase --abort
```

---

## Checking PR and CI status

```bash
# View PR overview (title, status, checks, reviews)
gh pr view "$PR"

# View only the CI checks (non-interactive)
gh pr checks "$PR"

# Watch checks stream live until they finish
gh pr checks "$PR" --watch

# View the PR diff to understand what changed
gh pr diff "$PR"
```

---

## Merge strategies

```bash
# Rebase merge (keeps a linear history — recommended)
gh pr merge "$PR" --rebase --delete-branch

# Squash merge (collapses all commits into one)
gh pr merge "$PR" --squash --delete-branch
```

Use `--rebase` by default for a clean linear history on `main`.

---

## Handling edge cases

### PR is already merged or closed

```bash
STATUS=$(gh pr view "$PR" --json state --jq '.state')
if [ "$STATUS" != "OPEN" ]; then
  echo "PR #$PR is $STATUS — skipping"
  continue
fi
```

### CI checks are failing after your push

```bash
# Read the failed check logs
gh run list --branch "$(git branch --show-current)"
gh run view <run-id> --log-failed
```

Fix the issue, commit again, and push. Checks re-trigger automatically.

### PR has requested changes / not approved

```bash
# See review status
gh pr view "$PR" --json reviewDecision,reviews

# If approval is required and not yet granted, you may need to request a review:
gh pr review "$PR" --approve   # if you have permission
```

### Push rejected (non-fast-forward)

This usually means someone else pushed to the PR branch since you checked it out:

```bash
git pull --rebase origin "$(git branch --show-current)"
# resolve any conflicts
git push origin HEAD
```

---

## Full self-contained example (condensed)

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$1"   # pass repo path as first argument
cd "$REPO_DIR"

git checkout main
git pull --rebase origin main

PR_NUMBERS=$(gh pr list --state open --json number,headRefName \
  --jq '[.[] | select(.headRefName | startswith("renovate/")) | .number] | sort | .[]')

for PR in $PR_NUMBERS; do
  STATUS=$(gh pr view "$PR" --json state --jq '.state')
  [ "$STATUS" != "OPEN" ] && echo "Skipping #$PR ($STATUS)" && continue

  gh pr checkout "$PR"
  git fetch origin main && git rebase origin/main

  npm install
  npm run build
  npm run lint --fix 2>/dev/null || npx eslint . --fix
  npm run test

  git add -A
  git diff --cached --quiet || git commit -m "fix: errors for PR #$PR"
  git push origin HEAD

  gh pr checks "$PR" --watch

  gh pr merge "$PR" --rebase --delete-branch

  git checkout main
  git pull --rebase origin main
done
```

---

## Quick-reference cheatsheet

| Goal | Command |
|---|---|
| List open PRs | `gh pr list --state open` |
| Check out PR branch | `gh pr checkout <number>` |
| View PR checks | `gh pr checks <number>` |
| Watch checks live | `gh pr checks <number> --watch` |
| Rebase-merge and delete | `gh pr merge <number> --rebase --delete-branch` |
| View failed CI logs | `gh run view <run-id> --log-failed` |
| Auto-fix lint | `npx eslint . --fix && npx prettier --write .` |
| Abort a bad rebase | `git rebase --abort` |
