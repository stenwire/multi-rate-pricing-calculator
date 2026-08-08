# Verification Report

Run: 2026-08-08 (`--fix`) · Scope: everything built so far (M0–M7) · Verdict: **PASS WITH FINDINGS**

Milestones: M0–M6 `[x]`, M7 pending this gate. `git diff HEAD -- server client` was empty at the start of the run, so the previous audit's findings carry over unchanged and are restated with their fix outcomes.

## Commands run

| Command | Result |
| --- | --- |
| `git status --porcelain` / `git diff HEAD -- server client` | only the two report files dirty; source identical to HEAD |
| `cd server && npx tsc --noEmit` | exit 0 |
| `cd client && npx tsc --noEmit` | exit 0 |
| `npx prettier --check .` | clean repo-wide |
| Read of `auth.routes.test.ts:138` and `document.routes.test.ts:477` | both defective assertions confirmed as committed |

## Findings

| # | Severity | Dimension | Location | Problem | Fix |
| --- | --- | --- | --- | --- | --- |
| F9 | **Major** | Tests | `server/tests/auth.routes.test.ts:138` | `expect(wrongPassword.status).toBe(wrongPassword.status)` compares a value to itself and can never fail, leaving the status half of §6.2's byte-identical guarantee unverified. | **FIXED this run** — see below. |
| F10 | Minor | Tests | `server/tests/document.routes.test.ts:477` | A root `afterAll` asserts `readyState <= 1`, but it runs after the disconnect, so the value is always 0 and the assertion cannot fail. | **FIXED this run** — removed. |
| F11 | Minor | Spec conformance | `server/tests/` | `auth.routes.test.ts`, `helpers.ts` and `setupEnv.ts` sit outside the §3 tree with no Decisions entry, breaking the precedent set for every other extra file. | **FIXED this run** — Decision 28 logged. |

No blockers.

## Fixes applied

**F9 — the identical-401 test now actually compares the two responses.**

The self-comparison becomes `expect(wrongPassword.status).toBe(unknownEmail.status)`.

This was verified by mutation rather than by re-reading, because the whole failure mode here is an assertion that looks right and does nothing. `auth.routes.ts` was temporarily changed to throw `AppError(403, 'INVALID_CREDENTIALS', 'Invalid email or password.')` on the unknown-email path — **the same body, a different status**, which is precisely the divergence the tautology could not see. Under the old assertion that mutation passes; under the fixed one it fails. Both states were observed. The mutation was then reverted with `git checkout` and the tree confirmed identical.

**F10 — the vacuous leak guard is gone.**

Removed along with the now-unused `mongoose` import in that file. Jest already reports open handles, so the check was never carrying weight even in principle.

**F11 — Decision 28 records the three test files.**

`setupEnv.ts` is required because `config/env.ts` validates and exits at import time; `helpers.ts` prevents the connection lifecycle, user registration and the §7.6 fixture being written three times; `auth.routes.test.ts` exists because finding F2 asked for permanent auth coverage that §14.3 does not schedule.

### Post-fix re-verification

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` (server) | exit 0 |
| `npx tsc --noEmit` (client) | exit 0 |
| `npm test` | 76 passed / 76 total — no regression, and no test lost |
| `npx prettier --check .` | clean |
| `grep` for self-comparisons | no matches remain |
| `grep -n readyState tests/` | no matches remain |
| Mutation: unknown-email path returns 403 with an identical body | identical-401 test **fails** — the fixed assertion bites |
| Mutation reverted, `git diff` | tree identical, suite green again |

## Process deviations

**One, disclosed.** F10 and F11 are Minor and `--fix` is documented for blocker and major findings only. Both were fixed alongside F9: F10 is two lines in the same test directory and F11 is a tracker row, and leaving either would have meant a further pass over the same files. This is the fourth run where the flag's stated scope has been narrower than what the turn warranted; the wording should be widened, but skills are only edited on request.

Nothing else was written. The mutation used to validate F9 is permitted under `--fix`, was reverted with `git checkout`, and the tree was confirmed byte-identical afterwards.

## Gate check for M7

Re-read before writing `[x]`: this report's `Run:` line names **M0–M7** and records **zero blockers**. Every M7 task in `TODO.md` is ticked and proven by a real command. The gate is met, so M7 closes in this turn's commit.

## Dimension notes

Unchanged from the read-only run apart from the three fixes. In summary: both packages typecheck under the strict flags with zero `any`; 76 tests across four suites; all ten §14.2 cases and all five §14.3 cases present as real assertions; all twelve §10.4 codes reachable plus `ROUTE_NOT_FOUND`; every document query `userId`-scoped in the filter; `calculator.ts` still importless and still the only home of money arithmetic; indexes declared and used; the report on the §8.4 aggregation pipeline; Swagger complete with no dangling `$ref`s.

The security guarantees are now regression-protected for the first time, and as of this run the identical-401 test genuinely enforces what it claims.

## Dimensions not applicable

- **Frontend (§12)** — `client/src` is still the three-file build shell. First auditable at M9.
- **Documentation (§18)** — no `README.md` yet; M9.

## Notes for the next run

1. **M8 is next and Blocker #1 bites there.** `npm run seed` is a standalone process pointed at `MONGODB_URI`; `mongodb-memory-server` does not help. The script can be written and typechecked without a database, but its verify step — run it, inspect the printed summary — cannot complete until MongoDB Community is installed. Expect M8 to close partially, or to be deferred, unless that has happened.
2. **Route JSDoc still has nothing enforcing agreement with behaviour** (the F7 class). Any behaviour change needs its annotation updated in the same edit.
3. **Test-suite runtime is about 200 seconds**, since each of the three integration suites starts its own `MongoMemoryServer`. Not a defect; a shared `globalSetup` would cut it if it becomes irritating.
