---
name: verify
description: Audit the Multi-Rate Pricing Calculator across build/types, tests, spec conformance, security, efficiency, DRY/simplicity, and frontend correctness, then write a severity-ranked findings report to VERIFICATION.md. Use when asked to verify, audit, review, check, or sanity-test work that has been completed, and before closing any milestone.
---

# Verify

Audit what has actually been built against `TECHNICAL_SPEC.md`. This skill **reports**; it does not change code unless invoked with `--fix`.

## Scope

Default: everything built so far. The user may narrow it:

- `/verify security` — one dimension
- `/verify M4` — one milestone's surface area, taken from `MILESTONES.md`
- `/verify server/src/routes/document.routes.ts` — one path
- `/verify --fix` — after reporting, apply the fixes for blocker and major findings, then re-run the failing checks

Read `MILESTONES.md` first to learn what is claimed complete. **Only audit what exists.** A file that has not been written yet is not a finding — say the dimension is not yet applicable and move on.

## Procedure

Work the dimensions in order. Run the real commands; do not assess by reading alone where a command can answer the question.

**1. Build and types.** `cd server && npx tsc --noEmit`, same for `client`. Confirm `strict`, `noUnusedLocals`, `noUnusedParameters` are genuinely enabled in both tsconfigs. Grep for `: any`, `as any`, `<any>`, and `@ts-ignore`. Run `npx prettier --check .`.

**2. Tests.** `cd server && npm test`. Then confirm coverage of the *required* cases, not just a green run: all ten calculator cases from spec §14.2 and all five integration cases from §14.3 must exist as real assertions. Verify the §7.6 sample asserts `45000 / 4000 / 1150 / 42150` exactly, and that the fractional-cents case asserts `500 / 2833 / 198 / 3031`.

**3. Spec conformance.** Walk `references/checklist.md`. The high-value ones: no route handler calls `res.json()` directly, every error code in the §10.4 table is reachable from some code path, `calculator.ts` imports nothing from Mongoose or Express or any I/O layer, and the file tree matches §3.

**4. Security.** The spec §16.1 list plus the auth rules in §6 and §11. Trace each one to the code that enforces it — a rule nobody enforces is a blocker even when no test fails.

**5. Efficiency.** Indexes declared and actually usable by the queries that need them; the report using the aggregation pipeline rather than in-memory summing; pagination bounded; no redundant round trips or double saves per mutation.

**6. DRY and simplicity.** Duplicated logic across route files, money math living anywhere but `calculator.ts`, dead code, commented-out blocks, unused imports, and comments that violate spec §16.4.

**7. Frontend.** Only once `client/` exists. The client must never compute a total, dollar→cent conversion happens only at submit, both axios interceptors are wired, and a finalized document renders no edit controls.

Full check lists for every dimension are in `references/checklist.md`. Read it before reporting.

## Severity

- **Blocker** — breaks the spec's "what done means" bar (§1), violates a §16.1 security rule, fails a mandatory test case, or breaks the build. Must be fixed before the milestone closes.
- **Major** — a real spec violation or a defect that will bite in review, but the app still works.
- **Minor** — style, naming, small duplication, comment-policy drift.

Verify a finding before reporting it. Trace the actual code path; if you cannot show how it goes wrong, either mark it explicitly as unconfirmed or drop it. A short list of real findings beats a long list of guesses.

## Output

Write `VERIFICATION.md` at the project root, replacing any previous run:

```markdown
# Verification Report

Run: <date> · Scope: <scope> · Verdict: PASS | PASS WITH FINDINGS | FAIL

## Commands run
| Command | Result |

## Findings
| # | Severity | Dimension | Location | Problem | Fix |

## Dimensions not applicable
<which, and why — e.g. frontend not yet built>
```

Verdict is **FAIL** if any blocker is open, **PASS WITH FINDINGS** if only major or minor remain, **PASS** if clean.

Then append one line to the `TODO.md` change log recording the run and its verdict, and add each blocker to the `TODO.md` Blockers table so it survives the session.

Finally, summarize for the user in chat: the verdict, the blocker count, and the single most important thing to fix. Do not paste the whole table into chat — it is in the file.
