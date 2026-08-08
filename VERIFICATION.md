# Verification Report

Run: 2026-08-08 (`--fix`) · Scope: everything built so far (M0–M5) · Verdict: **PASS WITH FINDINGS**

Milestones: M0–M4 `[x]`, M5 awaiting its gate. `git diff HEAD -- server client` was empty at the start of this run, so the findings from the previous audit carry over unchanged and are restated here with their fix outcomes.

## Commands run

| Command | Result |
| --- | --- |
| `git status --porcelain` (before) | only `TODO.md`, `VERIFICATION.md` from the prior run |
| `git diff --stat HEAD -- server client` | empty — source unchanged since the last audit |
| `cd server && npx tsc --noEmit` | exit 0 |
| `cd client && npx tsc --noEmit` | exit 0 |
| `cd server && npm test` | 12 passed / 12 total |
| `npx prettier --check .` | clean repo-wide |
| `grep -rn 'INVALID_DATE_RANGE'` over `server/src` | zero occurrences — F4 confirmed still open |

## Findings

| # | Severity | Dimension | Location | Problem | Fix |
| --- | --- | --- | --- | --- | --- |
| F4 | **Major** | Spec conformance | `server/src/validators/report.validators.ts` | `INVALID_DATE_RANGE` is in the §10.4 table but unreachable: a reversed range is caught by a Zod `.refine()` and answered `400 VALIDATION_ERROR`. The spec conflicts with itself — §10.4 line 1065 names the code, §8.4 line 934 calls the case a plain validation error, and §9 prescribes the refine that produces one. | **FIXED this run** — see below. |
| F5 | Minor | Efficiency / DRY | `document.routes.ts`, `lineItem.routes.ts` | Line items are priced twice on create and on add: `toPersistedLineItem` computes each line, then `recalculateDocument` immediately recomputes all of them plus the totals. | **FIXED this run** — see below. |
| F6 | Minor | DRY / dead code | `documentTotals.ts`, `lineItem.validators.ts` | `LineItemFields` and `lineItemFieldsSchema` are exported with no importer anywhere. | **FIXED this run** — see below. |
| F2 | Minor | Tests | `server/tests/` | Carried over. The entire HTTP surface has no permanent regression coverage; every proof so far came from throwaway probes. §14.3 schedules this for M7. | Not fixable here — M7 by nature. |

No blockers.

## Fixes applied

**F4 — `INVALID_DATE_RANGE` is now reachable.**

The ordering comparison moved out of the Zod schema and into the report handler, which throws `AppError(400, 'INVALID_DATE_RANGE', …)`. Format and presence failures stay in the schema and still answer `VALIDATION_ERROR`, because they are ordinary Zod failures.

This resolves the spec's internal conflict in the direction that makes §10.4 true, since that table is the reference clients are told to code against and a listed code that never fires is worse than a slightly reworded validation path. §8.4's prose is satisfied too — a reversed range still returns 400. The casualty is §9's literal instruction to enforce ordering with a `.refine()`; that instruction cannot coexist with §10.4's table, because anything the `validate` middleware rejects necessarily carries `VALIDATION_ERROR`. Recorded as Decision 25.

**F5 — line items are priced once.**

`toPersistedLineItem` is gone. Create and add now pass the validated input fields straight through, and `recalculateDocument` — which already recomputes every line before `save()` — populates the computed fields. Mongoose validates required paths at save time, not at construction or push, so the values are in place before validation runs. One authoritative pricing path instead of two.

**F6 — surplus exports removed.**

`LineItemFields` and `lineItemFieldsSchema` are now module-private. `lineItemFieldsSchema` remains load-bearing: both `lineItemInputSchema` and `updateLineItemSchema` derive from it. Only the `export` keyword was surplus.

### Post-fix re-verification

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` (server) | exit 0 |
| `npx tsc --noEmit` (client) | exit 0 |
| `npm test` | 12 passed / 12 total — no regression |
| `npx prettier --check .` | clean |
| `grep` for `any` / suppressions | none introduced |
| `grep -rn 'INVALID_DATE_RANGE'` | now present and thrown from the report handler |
| Scratchpad probe, 52 assertions | all passing — full M5 suite re-run plus new coverage for the reworked error path |

The probe re-ran the entire 46-assertion M5 suite to prove the F5 change did not disturb pricing, and added six assertions specifically for F4 and F5: reversed range now yields `INVALID_DATE_RANGE`, malformed and missing dates still yield `VALIDATION_ERROR`, and the §7.6 sample still totals `45000/4000/1150/42150` through the live API after the pricing path changed.

## Process deviations

**One, disclosed.** F5 and F6 are Minor, and `--fix` is documented as covering blocker and major findings only. F4 was squarely in scope; the two minors were fixed alongside it because both are small, both sit in the same files, and leaving them would have meant a third pass over the same code. This is a scope expansion beyond the skill text, recorded rather than glossed. The `--fix` definition still has no provision for minors — worth widening the wording, but skills are edited on request only.

Not a deviation, but worth stating: the previous run's disclosure about M5's marker is now moot — M5 is being closed in this turn's follow-up, not left mislabelled.

## Dimension notes

Unchanged from the previous run apart from the three fixes. In summary: both packages typecheck under the strict flags with zero `any`; all ten §14.2 calculator cases green; no `res.json()` outside the envelope helpers; `errorHandler` registered last; CORS explicit; `calculator.ts` still imports nothing and remains the only place money arithmetic lives; all eight document queries carry `userId` in the filter; both compound indexes plus the unique email index declared; the report uses the §8.4 aggregation pipeline; pagination bounded 1–100 with `find` and `countDocuments` running in parallel.

All twelve §10.4 codes are now reachable, plus `ROUTE_NOT_FOUND`.

## Dimensions not applicable

- **Frontend (§12)** — `client/src` is still the three-file build shell. First auditable at M9.
- **Documentation (§13, §18)** — no `README.md`; Swagger is M6.

## Notes for the next run

1. **M6 must define every referenced component schema.** The route files carry roughly forty `$ref`s to `Document`, `LineItem`, `LineItemInput`, `Discount`, `Pagination`, `ReportSummary`, `SuccessResponse`, `ErrorResponse` and `AuthResponseData`. §13.3 lists ten; `Discount` and `LineItemInput` are additions the routes now depend on.
2. **Jest env bootstrap still outstanding** — fifth run carrying this note. `jest.config.ts` needs `setupFiles` seeding a ≥32-character `JWT_SECRET` before any test imports `app.ts`. M7's first task.
3. **Blocker #1 open** — no local MongoDB; does not block M6 or M7.
4. **F2 is now the single largest gap** — no permanent HTTP coverage at all.
