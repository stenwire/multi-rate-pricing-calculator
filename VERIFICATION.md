# Verification Report

Run: 2026-08-08 (`--fix`) · Scope: everything built so far (M0–M8), closing the M8 gate · Verdict: **PASS WITH FINDINGS**

Milestones: M0–M7 `[x]`, M8 `[ ]` pending this gate, M9 unstarted. Working tree clean at the start of the run. Blocker #1 is closed, so for the first time the whole stack — including the seed — has been exercised against a real MongoDB rather than an in-memory one.

## Commands run

| Command | Result |
| --- | --- |
| `git status --porcelain` (before) | empty — clean baseline |
| `cd server && npx tsc --noEmit` | exit 0 |
| `cd client && npx tsc --noEmit` | exit 0 |
| `cd server && npm test` | 76 passed / 76 total across 4 suites |
| `npx prettier --check .` | clean repo-wide |
| `grep` for `any` / suppressions | no matches |
| `git ls-files --error-unmatch .env` | not tracked; `.gitignore:6` covers it |
| `git grep` for bcrypt hashes and JWTs in tracked files | two hits, both prose in `TODO.md` describing the `$2a$12$` prefix — no secrets |
| `grep -rn 'BCRYPT_SALT_ROUNDS ='` | **declared twice** — see F12 |
| `grep -rnE 'Math\.(round\|min\|floor\|ceil)\|/ *100'` outside `calculator.ts` | two hits, both non-monetary or display-only — see the DRY note |
| `grep` for literal totals in `seed.ts` | none — every figure is derived |
| `grep` for `recalculateDocument` in `seed.ts` | present; the seed uses the same write path as the API |

## Findings

| # | Severity | Dimension | Location | Problem | Fix |
| --- | --- | --- | --- | --- | --- |
| F12 | Minor | DRY / Security | `server/src/routes/auth.routes.ts:17`, `server/src/seed.ts:8` | `BCRYPT_SALT_ROUNDS = 12` is declared independently in two files. §6.1 fixes the cost factor at 12, so the two must agree; nothing enforces that. Editing one and missing the other would silently seed users at a different cost factor from the ones registered through the API — a security parameter drifting without any test noticing, since both values are currently correct and no assertion compares them. | Declare it once and import it. The natural home is alongside the other auth plumbing; exporting the constant from `auth.routes.ts` and importing it into `seed.ts` is the smallest change. |

No blockers. No major findings.

## Fixes applied

**F12 — the bcrypt cost factor is now declared once.**

`BCRYPT_SALT_ROUNDS` is exported from `auth.routes.ts` and imported by `seed.ts`. Both hashing sites now read the same constant, so the §6.1 requirement cannot drift between them.

### Post-fix re-verification

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` (server and client) | exit 0 |
| `npm test` | 76 passed / 76 total — no regression |
| `npx prettier --check .` | clean |
| `grep -rn 'BCRYPT_SALT_ROUNDS ='` | one declaration only |
| `npm run seed -- --force` re-run | succeeded; `mongosh` confirms the stored hash still carries the `$2a$12$` prefix |

## Process deviations

**One, disclosed.** F12 is Minor and `--fix` is documented for blocker and major findings only. It was fixed because it is a one-line change to a security parameter that two files must agree on, and leaving a duplicated cost factor in place while writing a report that names it as a drift risk seemed worse than the scope stretch. Fifth run where the flag's stated scope has been narrower than the turn warranted; the wording deserves widening, but skills are edited on request only.

Nothing else was written outside the two report files and the two files the fix touched.

## Gate check for M8

Re-read before writing `[x]`: this report's `Run:` line names **M0–M8** and records **zero blockers**. The single M8 task in `TODO.md` is ticked and was proven by running the seed against the real database and inspecting the result independently with `mongosh`. The gate is met, so M8 closes in this turn's commit.

## Dimension notes

- **Build and types** — both packages clean under the strict flags; zero `any`, zero suppressions; prettier clean.
- **Tests** — 76 across four suites. All ten §14.2 calculator cases and all five §14.3 integration cases present as real assertions. The seed is not covered by an automated test and does not need to be: §15 asks for a script, §14 does not schedule tests for it, and its output was verified directly against the database.
- **Spec conformance** — all twelve §10.4 codes reachable plus `ROUTE_NOT_FOUND`; `errorHandler` last; CORS explicit; `calculator.ts` importless; no `res.json()` outside the helpers. The §15 seed content matches exactly: both documents, the three sample line items, the finalized second document, and the `test@example.com` / `password123` user.
- **Security (§16.1)** — `.env` exists on disk with a generated 64-character secret, is gitignored and untracked, and a `git grep` for hashes and JWTs across tracked files found only prose. The seed prints the seeded password to the console, which is intentional and correct: it is a known fixture credential and the developer needs it to log in. F12 was the one real weakness and is fixed.
- **Efficiency** — unchanged. Indexes verified present on the *real* server this milestone, not just the in-memory one: `{userId,issueDate}`, `{userId,status}`, `{email}(unique)`.
- **DRY** — money math still only in `calculator.ts`. Two arithmetic hits outside it, both legitimate: `Math.ceil(total / limit)` in the documents list is pagination, not currency, and `cents / 100` in the seed's `formatMoney` is display formatting of an already-computed integer — the same operation §12.7 mandates on the client. Neither derives a monetary value. Recorded explicitly so a future run does not re-flag them.

## Dimensions not applicable

- **Frontend (§12)** — `client/src` is still the three-file build shell. First auditable at M9.
- **Documentation (§18)** — no `README.md` yet; M9. Swagger (§13) passed at M6 and is unchanged.

## Notes for the next run

1. **M9 is the last milestone and by far the largest**: six pages, six components, the axios instance with both interceptors, `utils/format.ts`, and the twelve-section README. It is also the first milestone where the frontend dimension becomes auditable.
2. **The end-to-end walkthrough is now possible.** MongoDB is running and seeded, so M9 can be verified by actually driving the app: log in as `test@example.com` / `password123`, open the seeded draft, confirm the displayed totals match the API response byte for byte, finalize it, and confirm every edit control disappears.
3. **Route JSDoc still has nothing enforcing agreement with behaviour** (the F7 class). Any behaviour change in M9 that touches an endpoint needs its annotation updated in the same edit.
4. **The client must never compute a total** — the single most important frontend rule, and the one worth checking first when M9 is audited.
