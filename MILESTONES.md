# Milestones — Multi-Rate Pricing Calculator

Created: 2026-08-08
Governing document: `TECHNICAL_SPEC.md`

Status: `[ ]` not started · `[~]` in progress · `[x]` complete and verified

A milestone reaches `[x]` only when every task under it in `TODO.md` is ticked **and** `/verify` reports zero blockers for it.

---

## `[x]` M0 — Skills and tracking

**Goal:** Project-housed `/implement` and `/verify` skills, a git repository, and this tracker.
**Acceptance:** Both skills invocable; `MILESTONES.md` and `TODO.md` at the project root; `git log` shows an initial commit.
**Verify:** `git log --oneline` and confirm both skills appear in the skill list.
**Completed:** 2026-08-08 — both `SKILL.md` files validated for layout and frontmatter, tracker seeded, initial commit made. Skills are discovered at session start, so `/implement` and `/verify` become invocable from the next session onward.

## `[x]` M1 — Scaffold

**Goal:** Root `.gitignore` and `.env.example` (spec §4 verbatim); `server/` and `client/` as two independent npm projects.
**Acceptance:** No workspaces, no root `package.json`, no shared package. Express pinned to 4.x. tsconfig has `strict`, `noUnusedLocals`, `noUnusedParameters`. `.prettierrc` present.
**Verify:** `npm ls express` shows 4.x; `npx tsc --showConfig` resolves the strict flags true; `cd client && npm run build`. (The server `tsc --noEmit` clean run lands in M2 — with `src/` and `tests/` still empty, tsc can only emit TS18003 "no inputs", so the flags were proven with a temporary probe file instead.)
**Completed:** 2026-08-08 — express@4.22.2; probe file confirmed `noUnusedLocals` fires (TS6133) and a clean file compiles at exit 0; client build green (31 modules, 142.67 kB); prettier clean across both packages.

## `[x]` M2 — Calculator and its unit tests

**Goal:** `server/src/services/calculator.ts` (spec §7) plus all ten required cases in `server/tests/calculator.test.ts` (spec §14.2).
**Acceptance:** Calculator imports nothing from Mongoose, Express, or any I/O layer. The §7.6 sample asserts exactly `subtotal=45000, totalDiscount=4000, totalTax=1150, grandTotal=42150`. Fractional-cents case (3333 @ 15% / 7%) asserts `500 / 2833 / 198 / 3031`.
**Verify:** `cd server && npm test`
**Completed:** 2026-08-08 — 12/12 green; `tsc --noEmit` exit 0; zero imports in `calculator.ts`; prettier clean repo-wide; no `.only`/`.skip`. Four mutations (tax on subtotal, clamp removed, floor instead of round, document-level rounding) each caught by the suite, then the file restored byte-identical with a green baseline.

## `[ ]` M3 — Foundation

**Goal:** `config/env.ts`, `config/db.ts`, `utils/AppError.ts`, `utils/response.ts`, `middleware/errorHandler.ts`, `middleware/validate.ts`, `types/express.d.ts` (spec §4, §8.0, §9, §10, §11.4).
**Acceptance:** Env validation crashes at startup naming the offending variable, with no silent fallbacks.
**Verify:** `cd server && npx tsc --noEmit`, plus a deliberate bad-env run that crashes with a clear message.
**Completed:**

## `[ ]` M4 — Models and auth

**Goal:** `models/User.ts`, `models/Document.ts` with the embedded LineItem sub-schema, then auth validators and routes (spec §5, §6).
**Acceptance:** Both compound indexes declared; `timestamps: true`; `toJSON` maps `_id`→`id`, drops `__v`, strips `passwordHash`. bcryptjs at 12 rounds. Unknown email and wrong password return an identical `INVALID_CREDENTIALS` response.
**Verify:** `cd server && npx tsc --noEmit && npm test`
**Completed:**

## `[ ]` M5 — Documents, line items, reports

**Goal:** `authenticate`, `loadDocument`, `requireDraft` middleware, then the three route files and their validators (spec §8.2–8.4, §11).
**Acceptance:** Every query scoped by `userId` at the query level. Finalize uses `findOneAndUpdate({ _id, status: 'draft' })`; zero matches returns 409 `ALREADY_FINALIZED`. Report uses the §8.4 aggregation pipeline, not in-memory summing. Every line-item mutation recomputes document totals.
**Verify:** `cd server && npx tsc --noEmit && npm test`
**Completed:**

## `[ ]` M6 — Swagger

**Goal:** `server/src/swagger.ts` with the ten component schemas from spec §13.3 and JSDoc/YAML on every route.
**Acceptance:** `/api-docs` renders; every endpoint documents its parameters, request body, all response codes, and `bearerAuth` where required.
**Verify:** Start the server and load `http://localhost:5000/api-docs`.
**Completed:**

## `[ ]` M7 — Integration tests

**Goal:** `document.routes.test.ts` and `lineItem.routes.test.ts` over `mongodb-memory-server` and `supertest` (spec §14.3).
**Acceptance:** All five required cases, including the four-way finalize lock (metadata update, add, update, delete line item — all 403 `DOCUMENT_FINALIZED`), ownership isolation returning 404, and the report counting only finalized documents.
**Verify:** `cd server && npm test`
**Completed:**

## `[ ]` M8 — Seed

**Goal:** `server/src/seed.ts` runnable as `npm run seed`, with `-- --force` to wipe (spec §15).
**Acceptance:** Both sample documents created, every computed field derived from the calculator rather than hardcoded.
**Verify:** `cd server && npm run seed` against a running MongoDB, then inspect the printed summary.
**Completed:**

## `[ ]` M9 — Client and README

**Goal:** Vite + React 18 + TypeScript + Tailwind client (spec §12), then the root `README.md` (spec §18).
**Acceptance:** Six pages, six components, axios instance with bearer-attach and 401-redirect interceptors, `utils/format.ts` as given. The client never computes a total; dollar→cent conversion happens only at submit. README carries all twelve sections under their exact headers, including the worked calculation example.
**Verify:** `cd client && npm run build`, then walk the app end to end against the seeded data.
**Completed:**
