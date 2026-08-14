# Milestones — Multi-Rate Pricing Calculator

Created: 2026-08-08
Governing document: `TECHNICAL_SPEC.md`

Status: `[ ]` not started · `[~]` in progress · `[x]` complete and verified

A milestone reaches `[x]` only when every task under it in `TODO.md` is ticked **and** `/verify` reports zero blockers for it.

---

## `[x]` M0 — Skills and tracking

**Goal:** Project-housed `/implement` and `/verify` skills, a git repository, and this tracker.
**Acceptance:** Both skills invocable; `MILESTONES.md` and `TODO.md` present under `docs/`; `git log` shows an initial commit.
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

## `[x]` M3 — Foundation

**Goal:** `config/env.ts`, `config/db.ts`, `utils/AppError.ts`, `utils/response.ts`, `middleware/errorHandler.ts`, `middleware/validate.ts`, `types/express.d.ts` (spec §4, §8.0, §9, §10, §11.4).
**Acceptance:** Env validation crashes at startup naming the offending variable, with no silent fallbacks.
**Verify:** `cd server && npx tsc --noEmit`, plus a deliberate bad-env run that crashes with a clear message.
**Completed:** 2026-08-08 — `tsc --noEmit` exit 0, tests still 12/12, prettier clean, zero `any`. Env crash proven across five scenarios (missing vars, 31-char secret, non-URL URI, valid-with-defaults, Atlas `mongodb+srv://`), each exiting 1 with the offending variable named; root `.env` path resolution confirmed with a temporary file; unreachable MongoDB exits 1 per Appendix B. Envelope, `AppError`, `errorHandler` and `validate` exercised by a throwaway supertest harness, 11/11 — including `details` omitted when absent and no stack leaking into a 500 body.

## `[x]` M4 — Models and auth

**Goal:** `models/User.ts`, `models/Document.ts` with the embedded LineItem sub-schema, then auth validators and routes (spec §5, §6).
**Acceptance:** Both compound indexes declared; `timestamps: true`; `toJSON` maps `_id`→`id`, drops `__v`, strips `passwordHash`. bcryptjs at 12 rounds. Unknown email and wrong password return an identical `INVALID_CREDENTIALS` response.
**Verify:** `cd server && npx tsc --noEmit && npm test`
**Completed:** 2026-08-08 — `tsc --noEmit` exit 0, tests 12/12, prettier clean, zero `any`, no `res.json()` outside the helpers. A `mongodb-memory-server` + supertest probe passed 26/26, covering bcrypt at 12 rounds in storage, the JWT verifying against the secret, byte-identical `INVALID_CREDENTIALS` on both failure paths, `passwordHash` absent from every serialization, both compound indexes, the unique email index, and the status enum rejecting values outside `draft`/`finalized`. *Gate history: initially closed without its verify pass and reverted to `[~]` the same day; closed properly once the M0–M4 run recorded zero blockers.*

## `[x]` M5 — Documents, line items, reports

**Goal:** `authenticate`, `loadDocument`, `requireDraft` middleware, then the three route files and their validators (spec §8.2–8.4, §11).
**Acceptance:** Every query scoped by `userId` at the query level. Finalize uses `findOneAndUpdate({ _id, status: 'draft' })`; zero matches returns 409 `ALREADY_FINALIZED`. Report uses the §8.4 aggregation pipeline, not in-memory summing. Every line-item mutation recomputes document totals.
**Verify:** `cd server && npx tsc --noEmit && npm test`
**Completed:** 2026-08-08 — `tsc --noEmit` exit 0 on both packages, 12/12 unit tests, prettier clean, zero `any`. Gate satisfied by the M0–M5 `/verify --fix` run: 0 blockers, and its one Major finding (F4, `INVALID_DATE_RANGE` unreachable) fixed in the same run. Re-verified 52/52 end-to-end against `mongodb-memory-server` — the §7.6 sample and the fractional-cents case through the live API, the four-way finalize lock, a real concurrent-finalize race, ownership isolation as 404, all eight document queries `userId`-scoped, and the report counting only finalized documents.

## `[x]` M6 — Swagger

**Goal:** `server/src/swagger.ts` with the ten component schemas from spec §13.3 and JSDoc/YAML on every route.
**Acceptance:** `/api-docs` renders; every endpoint documents its parameters, request body, all response codes, and `bearerAuth` where required.
**Verify:** Bind port 5000 and request `http://localhost:5000/api-docs/`; assert the generated spec has no dangling `$ref`s and documents all 12 Appendix A operations. (The stated "start the server" form is blocked by Blocker #1 — `index.ts` connects to MongoDB before listening — so the exported `app` is bound directly instead, which exercises the same routing and the same URL.)
**Completed:** 2026-08-08 — gate satisfied by the M0–M6 run (zero blockers), whose two findings were fixed in the same turn. `tsc --noEmit` exit 0 on both packages, 12/12 unit tests, prettier clean, zero `any`. Spec probe 19/19: all ten §13.3 schemas defined, all 12 operations carrying summary, parameters and responses, 67 `$ref`s with none dangling, auth endpoints `security: []` and the rest inheriting `bearerAuth`. Real HTTP on :5000 returned 200 `text/html` titled "Swagger UI" without a token, while `/api/v1/documents` correctly returned the 401 envelope.

## `[x]` M7 — Integration tests

**Goal:** `document.routes.test.ts` and `lineItem.routes.test.ts` over `mongodb-memory-server` and `supertest` (spec §14.3).
**Acceptance:** All five required cases, including the four-way finalize lock (metadata update, add, update, delete line item — all 403 `DOCUMENT_FINALIZED`), ownership isolation returning 404, and the report counting only finalized documents.
**Verify:** `cd server && npm test`
**Completed:** 2026-08-08 - gate satisfied by the M0-M7 run (zero blockers), whose three findings were fixed in the same turn. Suite went from 12 to 76 tests across four files; `tsc --noEmit` exit 0 on both packages, prettier clean, zero `any`, no `.only` or `.skip`. All five section 14.3 cases present as real assertions, plus the concurrent-finalize race, the section 7.6 totals end to end, inclusive date bounds and the INVALID_DATE_RANGE/VALIDATION_ERROR split. Sensitivity proved by four mutations: disabling `requireDraft` failed 7 tests, dropping the `userId` scope failed the ownership tests, splitting login's throw site failed the identical-401 test, and returning 403 with an identical body failed it again once F9 was fixed. Each reverted, tree confirmed identical.

## `[x]` M8 — Seed

**Goal:** `server/src/seed.ts` runnable as `npm run seed`, with `-- --force` to wipe (spec §15).
**Acceptance:** Both sample documents created, every computed field derived from the calculator rather than hardcoded.
**Verify:** `cd server && npm run seed` against a running MongoDB, then inspect the printed summary.
**Completed:** 2026-08-08 - gate satisfied by the M0-M8 run (zero blockers), whose single finding was fixed in the same turn. The first milestone verified against a real MongoDB rather than an in-memory one. `npm run seed` printed the section 7.6 totals, and mongosh then confirmed independently what was stored: subtotal=45000 discount=4000 tax=1150 grand=42150 on Sample Invoice and 150000/7500/14250/156750 on Q1 Consulting, the password as a $2a$12$ hash rather than plaintext, both compound indexes and the unique email index present on the real server, line item ids generated, and both documents owned by the seeded user. Rerunning without `--force` refuses with a message naming the flag instead of dying on E11000; rerunning with `--force` leaves exactly one user and two documents. No total in the seed is hand-written - every figure comes from `recalculateDocument`.

## `[x]` M9 — Client and README

**Goal:** Vite + React 18 + TypeScript + Tailwind client (spec §12), then the root `README.md` (spec §18).
**Acceptance:** Six pages, six components, axios instance with bearer-attach and 401-redirect interceptors, `utils/format.ts` as given. The client never computes a total; dollar→cent conversion happens only at submit. README carries all twelve sections under their exact headers, including the worked calculation example.
**Verify:** `cd client && npm run build`, then walk the app end to end against the seeded data.
**Completed:** 2026-08-08 - gate satisfied by the M0-M9 run (zero blockers), whose two findings were fixed in the same turn. Client tree matches section 3 exactly: six pages, six components, api, context, hooks, utils. Both packages typecheck, client builds at 103 modules, 76/76 tests, prettier clean, zero `any`. The client never computes a total - no arithmetic on any money field anywhere in `client/src`, and every mutation re-renders from the document the server returns; the single dollar-to-cent conversion is at submit time. `utils/format.ts` byte-identical to section 12.7. Both interceptors wired, four authenticated routes guarded, finalize behind a confirmation, finalized documents rendering no edit controls. README carries all twelve section 18.1 headings, verified by grep. End-to-end walkthrough against the live stack: logged in as the seeded user, loaded Sample Invoice at 45000/4000/1150/42150, added and removed a line item watching totals move and return, finalized, then confirmed PUT, POST line-items and DELETE all answer DOCUMENT_FINALIZED.

## `[x]` M10 - Extras

**Goal:** The three optional stretch goals, requested after the build closed: duplicate a
finalized document into a new draft, reject finalize when a line item is invalid, and a
printable view.

**Acceptance:** Finalize refuses a document with a quantity below 1 or a negative unit price and
says which field; duplicating a finalized document produces a draft with the same lines and
server-recomputed totals; printing a document yields the document itself, without application
chrome.

**Verify:** `cd server && npm test`, `cd client && npm run build`, and drive all three in a
browser including print-media emulation.

**Completed:** 2026-08-09 - gate satisfied by the M0-M10 run (zero blockers), whose single finding was fixed in the same turn. 79/79 tests with the finalize guard mutation-tested; both packages typecheck; prettier clean; all thirteen error codes reachable. Duplicate, print preview and the reworked line-item dialog were each driven in a real browser, including the dialog at 390px. Two print bugs and an unusable edit flow were found and fixed by looking at the running app rather than reading the code.
