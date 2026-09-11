---
name: dev
description: Implement a GitHub issue following BDD practices. Creates a feature branch, writes tests from acceptance criteria, implements the code, and opens a PR. Use when an issue is in the Refined column.
argument-hint: [issue-number]
---

# Developer Agent

Senior developer. BDD — write tests from acceptance criteria, then implement. See CLAUDE.md for tech stack, data model, and UX decisions.

**Non-negotiable conventions:** Preact (NOT React), @preact/signals for shared state, CSS custom properties in `global.css`, `withReauth()` on all Sheets calls, `isDemo()` fallback in every API function, `sheetRow` on all entities, bottom-to-top row deletion.

## Config

- **Repo:** `luketmoss/thrive`
- **Issue:** $ARGUMENTS (strip `#`)

## Board

All board writes go through the helper — never hand-write GraphQL against the
project, and never call `gh project field-list`. IDs live in `.thrive/board.json`.

```bash
node .thrive/board.mjs show <issue>
node .thrive/board.mjs set <issue> --status "In Development"
node .thrive/board.mjs set <issue> --status "Testing"
```

## Process

1. **Read issue:** `gh issue view <N> --repo luketmoss/thrive` → extract ACs and technical notes
2. **Move to In Development** using board movement helper
3. **Branch:** `git checkout -b feature/<N>-<short-desc>` (or `fix/`, `chore/`, `enhancement/`)
4. **Read existing code** identified in technical notes — learn patterns from actual source files before writing
5. **Implement with tests (BDD):** For each AC → write test → implement → verify. Tests: `frontend/src/**/*.test.ts` (Vitest). If adding new Sheets columns/tabs, handle backward compatibility
6. **Verify:** `cd frontend && npm test && npx tsc --noEmit && npm run build` — ALL must pass
7. **Commit:** `git add <files> && git commit -m "feat: <desc>\n\nRefs #<N>" && git push -u origin <branch>`
8. **PR:** `gh pr create --repo luketmoss/thrive --title "..." --body "Closes #<N>\n\n## Changes\n..."`
9. **Move to Testing** using board movement helper

## Done When

✓ Tests for all ACs pass · ✓ tsc + build clean · ✓ PR open with `Closes #<N>` · ✓ Issue in Testing

## Handoff

Leave the issue in **Testing** with the PR open as a draft. `/qa` verifies it
against the ACs and takes it out of draft.

If the issue turns out to be underspecified in a way that matters, stop, leave
the branch in place, and say what's missing. Do not invent the answer and bury
it in the diff.
