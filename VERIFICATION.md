# Verification Report

Run: 2026-08-08 · Scope: M2 close (calculator + unit tests), plus the M0–M1 carry-overs · Verdict: **PASS**

Milestones claimed complete in `MILESTONES.md`: M0, M1, M2. M3 onward are unstarted. This run folds the M2 milestone-close audit into the implementation turn — every check below was executed as a real command in that turn, not re-run ceremonially afterwards.

## Commands run

| Command | Result |
| --- | --- |
| `cd server && npm test` | **12 passed, 12 total**, 1 suite, exit 0 |
| `cd server && npx tsc --noEmit` | exit 0 — clears prior finding F3 |
| `cd client && npx tsc --noEmit` | exit 0 |
| `npx prettier --check .` | clean repo-wide — clears prior finding F1 |
| `grep -nE "^\s*(import\|const .* = require)" src/services/calculator.ts` | no matches — module is fully pure |
| `grep -nE '\b(describe\|it\|test)\.(only\|skip)\b' server/tests/*.ts` | no matches |
| Mutation 1 — tax computed on `subtotal` instead of `afterDiscount` | 4 failed / 8 passed — **caught** |
| Mutation 2 — fixed-discount clamp removed | 1 failed / 11 passed — **caught** |
| Mutation 3 — percent discount `Math.floor` instead of `Math.round` | 1 failed / 11 passed — **caught** |
| Mutation 4 — rounding introduced at the document level | 1 failed / 11 passed — **caught** |
| Restore + `diff` against baseline | byte-identical, 12/12 green |

## Findings

None. All four findings from the previous run are cleared:

| Prior # | Status |
| --- | --- |
| F1 — prettier failing on `.claude/` documents | Fixed: `.claude/` added to `.prettierignore` (Decision 8). `prettier --check .` clean. |
| F2 — client entry files undocumented | Fixed: Decision 7 logged for `client/index.html` and `client/src/index.css`. |
| F3 — `tsc --noEmit` exiting 2 on an empty tree | Resolved as predicted: exit 0 now that `src/` has content. |
| F4 — `npm test` exiting 1 with no `tests/` directory | Resolved as predicted: suite runs, 12/12. |

## Dimension notes for this scope

- **Tests (§14.2)** — all ten required cases present as real assertions. The sample document is split across two tests (line-level values, then document totals); the fractional-cents case asserts `500 / 2833 / 198 / 3031`; the §7.6 totals assert `45000 / 4000 / 1150 / 42150`. One extra case covers omitted `discount` and `taxPercent`, exercising the `?? 0` path in §7.2 steps 2 and 4. Green alone was not treated as proof — the four mutations above establish that the suite actually discriminates.
- **Spec conformance (§7)** — purity confirmed by grep. Tax applies to `afterDiscount`. Fixed discount clamped via `Math.min`. `Math.round` appears exactly twice per line and nowhere at document level, so `grandTotal === subtotal - totalDiscount + totalTax` holds by construction and is asserted directly.
- **DRY (§17)** — money math exists only in `calculator.ts`; nothing else computes yet. The private `computeDiscountAmount` helper is reached from one call site and keeps the branch logic out of `computeLineItem`.
- **Comments (§16.4)** — three comments in the module, each explaining a non-obvious decision (clamping, tax base, absence of document-level rounding). No file header, no separators, no restatement.

## Dimensions not applicable

- **Security (§16.1, §6, §11)** — no auth, models, queries, or handlers yet. Repository-level items still hold: `.env` gitignored, no secrets in tracked files.
- **Efficiency (§16.2)** — no models, indexes, or queries.
- **Frontend (§12)** — only the build shell exists.
- **Documentation (§13, §18)** — no `README.md`, no Swagger yet.

## Note for the next run

M3 introduces `config/env.ts`, which parses at import time. No `.env` exists on disk yet, so the dev server will crash by design (correct per §4) and the Jest suite will need `process.env` seeded via `setupFiles` before any app import — flagged in the plan's traps list and still outstanding.
