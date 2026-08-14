# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

The application has not been written yet. [TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md) is a complete, prescriptive implementation contract for a Multi-Rate Pricing Calculator (a take-home assignment) and is the authority: it explicitly states that anything not specified is not required, and anything specified is mandatory. Read the relevant section before implementing, and do not add features, files, or dependencies it does not call for (see its Appendix C for the explicit out-of-scope list).

## Workflow — read the tracker first

The build is driven by two project-housed skills, and progress is recorded in files rather than in conversation memory. **Before doing any work, read [MILESTONES.md](docs/MILESTONES.md) and [TODO.md](docs/TODO.md)** — they, not your recollection, say what is already done.

- **`/implement`** ([.claude/skills/implement/](.claude/skills/implement/)) — carries the build forward one task at a time through milestones M0–M9. Its loop is fixed: read the tracker, announce the task, implement it, prove it with a real command, write back the change log, commit. A task is never ticked on inspection alone.
- **`/verify`** ([.claude/skills/verify/](.claude/skills/verify/)) — audits what exists across eight dimensions (build/types, tests, spec conformance, security, efficiency, DRY, frontend, docs) against [its checklist](.claude/skills/verify/references/checklist.md), and writes a severity-ranked report to `docs/VERIFICATION.md`. Run it before closing any milestone; blockers must be fixed, not waived.

`docs/MILESTONES.md`, `docs/TODO.md`, and `docs/VERIFICATION.md` are build artifacts deliberately outside the spec §3 tree — see the Decisions table in `docs/TODO.md`.

Two independent npm projects will live under `server/` and `client/`. There is no monorepo tooling, no workspaces, and deliberately no shared package — types needed on both sides are duplicated by design.

## Commands

Once scaffolded per the spec, from the respective directory:

```bash
cd server && npm install && npm run dev      # Express API on :5000, Swagger at /api-docs
cd client && npm install && npm run dev      # Vite dev server on :5173
cd server && npm run seed                    # sample user + documents (npm run seed -- --force to wipe)
cd server && npm test                        # Jest + ts-jest
cd server && npm test -- calculator          # single suite by filename pattern
cd server && npm test -- -t "fixed discount" # single test by name
```

Environment lives in a single `.env` at the project **root** (not per-package); `server/src/config/env.ts` resolves it via `path.resolve(__dirname, '../../../.env')`. Missing or invalid vars must crash the process at startup — no fallbacks.

## Architecture

**Request pipeline.** Route handlers are thin: validate → call calculator/service → respond via helper. Business logic never lives in a handler. Mutating document and line-item routes share the middleware chain `authenticate → loadDocument → requireDraft → validate`, which is where authorization, existence, and immutability are enforced — not in handler bodies. Both `document.routes.ts` and `lineItem.routes.ts` mount under `/api/v1/documents`.

**The calculator is the core.** `server/src/services/calculator.ts` is a pure module with zero imports from Mongoose, Express, or any I/O layer — it takes plain objects and returns plain objects. This purity is what makes the highest-risk logic exhaustively unit-testable, so preserve it. Everything that writes a document (create, and every line-item mutation) recomputes through it; nothing else may compute money.

**Money is integer cents, end to end.** The API accepts and returns integers in the smallest currency unit ($100.00 = `10000`). Only `taxPercent` and percent-discount `value` are ordinary decimals. The client converts dollars→cents on submit and cents→display on render; it never computes totals. Field names are intentionally currency-agnostic (`unitPrice`, not `unitPriceCents`) so multi-currency would later need only a `currency` field, not a rename.

**Rounding contract.** `Math.round()` is applied at most twice per line — once for percent discount, once for tax — and never at the document level; document totals are exact sums of already-rounded line values. This guarantees `grandTotal === subtotal - totalDiscount + totalTax` exactly. Tax applies to the post-discount amount. A fixed discount is clamped to the line subtotal so a line can never go negative.

**Persistence.** Line items are embedded subdocuments on `Document`, always read and written with their parent. Both models use `timestamps: true` and a `toJSON` transform (`_id` → `id`, drop `__v`; `User` also strips `passwordHash`).

## Invariants that are easy to violate

- **The client never sends computed fields.** Strip `subtotal`, `discountAmount`, `afterDiscount`, `taxAmount`, `lineTotal`, document totals, and `status` from any request body — silently ignore rather than reject.
- **Every response goes through the envelope helpers** in `utils/response.ts`. No handler calls `res.json()` directly; the global error handler (registered last) is the only other writer.
- **Every query is scoped by `userId`** at the query level, never post-filtered. A document belonging to another user returns 404, never 403 — "not found" and "not yours" must be indistinguishable, as must "user not found" and "wrong password" on login (both `INVALID_CREDENTIALS`).
- **`draft` → `finalized` is one-way.** Finalize uses `findOneAndUpdate({ _id, status: 'draft' })` for race safety; zero matches means 409 `ALREADY_FINALIZED`. Immutability is enforced by the API via `requireDraft`, not by hiding frontend buttons.
- **An invalid ObjectId in `:id` yields 404, not 400.**
- **`authenticate` does not hit the database** — the JWT alone is sufficient; orphaned tokens after user deletion are accepted scope.
- The calculator must reproduce the sample document in spec §7.6 exactly (`subtotal=45000, totalDiscount=4000, totalTax=1150, grandTotal=42150`). If it doesn't, the implementation is wrong.

## Code style

Strict TypeScript, no `any` (use `unknown` plus narrowing), `noUnusedLocals`/`noUnusedParameters` on, Prettier defaults. Comments are minimal: explain non-obvious business decisions (clamping, race handling) and nothing that restates the code — no file headers, no section separators, no JSDoc on internal functions. JSDoc/YAML blocks in `routes/*.ts` are the exception: swagger-jsdoc parses them into the OpenAPI spec, so every endpoint needs one. `console.log` appears only in the seed script; errors use `console.error`. No dead code, commented-out blocks, or unused imports.
