---
name: review
description: Perform a code review on a PR for a GitHub issue. Checks code quality, conventions, security, and test coverage. Use when an issue is in the Code Review column.
argument-hint: [issue-number]
---

# Code Review Agent

Senior engineer. Reviews PRs for correctness, conventions, security, and maintainability. See CLAUDE.md for tech stack and data model.

## Config

- **Repo:** `luketmoss/thrive`
- **Issue:** $ARGUMENTS (strip `#`)

## Board

All board writes go through the helper — never hand-write GraphQL against the
project, and never call `gh project field-list`. IDs live in `.thrive/board.json`.

```bash
node .thrive/board.mjs show <issue>
node .thrive/board.mjs set <issue> --status "Ready to Ship"
node .thrive/board.mjs set <issue> --status "In Development"
```

## Conventions (violations = blocking)

- **Preact** (NOT React) — imports from `preact/hooks`, NOT `react`
- **@preact/signals** for shared state — `signal()`, `computed()` at module level. `useState` only for component-local state
- **CSS** custom properties in `global.css` — no frameworks, no modules. Mobile-first (375px). Touch targets ≥ 44×44px
- **API:** direct `fetch()` to Sheets REST API. All calls wrapped with `withReauth()`. Every API function checks `isDemo()` first. All entities carry `sheetRow`. Row deletion bottom-to-top
- **Security:** Sheets formula injection prevention (prefix `'` if input starts with `=+\-@\t`). No secrets in client code
- **Quality:** TypeScript strict, no `any` unless documented. Explicit return types on exports. No `console.log`. No dead code

## Process

1. **Find PR:** `gh issue view <N>` → `gh pr list --search "Closes #<N>"` → `gh pr diff <PR_N>`
2. **Read changed files in full** (not just diff) — check patterns, ripple effects
3. **Review checklist per file:** Correctness (ACs, edge cases, errors) · Conventions (above) · Security (injection, XSS, credentials) · Performance (re-renders, N+1) · Tests (per AC, meaningful, error paths) · Maintainability (naming, DRY, no dead code)
4. **Submit review:**

```bash
gh pr review <PR_N> --repo luketmoss/thrive --comment --body "$(cat <<'EOF'
## Code Review — Issue #<N>
### Summary
...
### Checklist
- [x] Correctness · Conventions · Security · Tests · Maintainability
### Feedback
...
### Verdict: APPROVED / CHANGES REQUESTED
EOF
)"
```

**Note:** Use `--comment` (not `--approve`) because GitHub does not allow approving your own PRs. For CHANGES REQUESTED, use `--comment` and clearly state blocking issues in the body.

5. **Move issue:** APPROVED → Ready to Ship · CHANGES REQUESTED → In Development

Do not merge. `/ship` is the only skill that merges.

**Severity:** Blocking (must fix) · Suggestion (recommended) · Nit (preference)

## Handoff

On APPROVED: move the issue to **Ready to Ship**. `/ship` merges — this skill
never does. Merging is the only irreversible action in the system and it is
written down in exactly one place.

On CHANGES REQUESTED: move it back to **In Development** and state the blocking
issues plainly.
