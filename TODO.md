# Working Log — Multi-Rate Pricing Calculator

Created: 2026-08-08
Phase ledger: `MILESTONES.md` · Contract: `TECHNICAL_SPEC.md`

---

## Task queue

Ticked only when verified by a real command, never on inspection alone.
`[ ]` pending · `[~]` in progress or partially done · `[x]` done and verified

### M0 — Skills and tracking

- [x] `git init`, root `.gitignore`
- [x] `/implement` skill with milestone and todo templates
- [x] `/verify` skill with audit checklist
- [x] Seed `MILESTONES.md` and `TODO.md`

### M1 — Scaffold

- [x] Root `.env.example` (spec §4 verbatim)
- [x] `server/` npm project: deps, `tsconfig.json`, `jest.config.ts`, `.prettierrc`, scripts
- [x] `client/` npm project: Vite + React 18 + TypeScript + Tailwind v4, `tsconfig.json`, `vite.config.ts`
- [x] Confirm Express resolves to 4.x, not 5.x — resolved 4.22.2

### Carry-over from `/verify` 2026-08-08 (M0–M4 run)

Deferred minor findings. Detail in `VERIFICATION.md`.

- [x] F1 — **fixed** in the `--fix` run: `errorHandler` maps body-parser's `entity.parse.failed` to 400 `VALIDATION_ERROR`; verified 7/7 including that application `SyntaxError`s still reach the 500 path
- [ ] F2 — `auth.routes.ts` has no permanent test coverage; fold register/login assertions into M7's integration suite, especially the identical-401 property
- [x] F3 — **fixed**: `/api/v1` catch-all returns `404 ROUTE_NOT_FOUND` in the envelope instead of Express's HTML page; verified 7/7, including that `/api-docs` still falls through for M6

### Carry-over from `/verify` 2026-08-08 (M0–M1 run)

Deferred minor findings. Detail in `VERIFICATION.md`.

- [x] F1 — `.claude/` added to `.prettierignore`; `prettier --check .` now clean repo-wide
- [x] F2 — Decision 7 logged for `client/index.html` and `client/src/index.css`
- [x] F3/F4 — both re-run at M2 close: `tsc --noEmit` exit 0, `npm test` 12/12 green

### M2 — Calculator and its unit tests

- [x] `services/calculator.ts` — `computeLineItem`, `computeDocumentTotals`, the three §7.5 interfaces
- [x] `tests/calculator.test.ts` — all ten cases from §14.2
- [x] §7.6 sample document asserts exactly `45000 / 4000 / 1150 / 42150`

### M3 — Foundation

- [x] `config/env.ts` (Zod-validated, crashes on invalid) and `config/db.ts`
- [x] `utils/AppError.ts` and `utils/response.ts`
- [x] `middleware/errorHandler.ts` and `middleware/validate.ts`
- [x] `types/express.d.ts` — `userId` only; `document?: IDocument` added in M4 with the model
- [x] `app.ts` (exports the app, no listen) and `index.ts` (connect + listen)

### M4 — Models and auth

- [x] `models/User.ts` with `toJSON` stripping `passwordHash`
- [x] `models/Document.ts` with embedded LineItem sub-schema and both compound indexes
- [x] `validators/auth.validators.ts`
- [x] `routes/auth.routes.ts` — register and login
- [x] `types/express.d.ts` completed with `document?: IDocument` (was deferred from M3)

### M5 — Documents, line items, reports

- [ ] `middleware/authenticate.ts`, `loadDocument.ts`, `requireDraft.ts`
- [ ] `validators/document.validators.ts`, `lineItem.validators.ts`, `report.validators.ts`
- [ ] `routes/document.routes.ts` — list, create, detail, update, delete, finalize
- [ ] `routes/lineItem.routes.ts` — add, update, remove
- [ ] `routes/report.routes.ts` — summary aggregation

### M6 — Swagger

- [ ] `swagger.ts` with the ten component schemas from §13.3
- [ ] JSDoc/YAML annotations on every route

### M7 — Integration tests

- [ ] Test harness: `mongodb-memory-server`, `supertest`, env bootstrap
- [ ] `document.routes.test.ts` — finalize lock, no-line-items finalize, ownership isolation
- [ ] `lineItem.routes.test.ts` — mutation lock, validation rejection
- [ ] Report includes only finalized documents

### M8 — Seed

- [ ] `src/seed.ts` with `--force`, both sample documents, calculator-derived totals

### M9 — Client and README

- [ ] `api/client.ts` axios instance with both interceptors
- [ ] `context/AuthContext.tsx`, `hooks/useAuth.ts`, `components/ProtectedRoute.tsx`, `components/Layout.tsx`
- [ ] `utils/format.ts` (spec §12.7 verbatim)
- [ ] Login and Register pages
- [ ] Documents list and Create Document pages
- [ ] Document detail: line items table, totals, add/edit/remove, finalize
- [ ] Report page
- [ ] Root `README.md` — all twelve sections from §18

---

## Change log

Append-only. Newest at the bottom.

| Date | Milestone | Files | What changed and why |
| --- | --- | --- | --- |
| 2026-08-08 | M0 | `.gitignore` | Repository initialized on `main`; ignores `node_modules`, build output, coverage, `.env`, and the `mongodb-memory-server` binary cache. |
| 2026-08-08 | M0 | `.claude/skills/implement/**` | `/implement` skill plus `MILESTONES.md` and `TODO.md` templates. Encodes the read-tracker → pick task → implement → prove → write back → commit loop, and the Appendix C scope guardrails. |
| 2026-08-08 | M0 | `.claude/skills/verify/**` | `/verify` skill plus a 100-item audit checklist across eight dimensions, each citing its governing spec section. Reports to `VERIFICATION.md`; fixes only under `--fix`. |
| 2026-08-08 | M0 | `MILESTONES.md`, `TODO.md` | Tracker seeded from the templates with the M0–M9 breakdown. |
| 2026-08-08 | M1 | `.env.example`, `.prettierrc`, `.prettierignore` | Env template copied verbatim from spec §4. Single Prettier config at the root, found by both packages via upward resolution, so the setting is not duplicated. |
| 2026-08-08 | M1 | `server/package.json`, `tsconfig.json`, `jest.config.ts` | Server project with the exact §2 stack. 531 packages installed; express resolved to 4.22.2. tsconfig carries `strict`, `noUnusedLocals`, `noUnusedParameters`; jest on `ts-jest` with `--runInBand` for the in-memory Mongo suite later. |
| 2026-08-08 | M1 | `client/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/{main.tsx,App.tsx,index.css}` | Client project: React 18.3.1, Vite 5.4.21, Tailwind 4.3.3, Router 6.30.4, axios 1.19.0. Build verified green. `App.tsx` is a minimal shell that M9 replaces with the router. |
| 2026-08-08 | M0–M1 | `VERIFICATION.md` | `/verify` full-scope run. Verdict **PASS WITH FINDINGS**: 0 blockers, 0 major, 4 minor (F1 prettier on `.claude/` docs, F2 undocumented client entry files, F3/F4 typecheck and jest exiting non-zero on an empty source tree — both self-resolving at M2). |
| 2026-08-08 | M1 | `.prettierignore`, `TODO.md` | Cleared `/verify` carry-overs F1 and F2: `.claude/` excluded from Prettier, and Decisions 7–8 added covering the client entry files and that exclusion. |
| 2026-08-08 | M2 | `server/src/services/calculator.ts` | The pure calculation module (§7). Zero imports — verified by grep, not by eye. A private `computeDiscountAmount` keeps `computeLineItem` readable; totals accumulate in a single pass with no document-level rounding, so `grandTotal === subtotal - totalDiscount + totalTax` holds exactly. |
| 2026-08-08 | M2 | `server/tests/calculator.test.ts` | Twelve tests covering all ten §14.2 cases (the sample document is split into a line-level and a document-level assertion, plus one extra for omitted `discount`/`taxPercent`). Suite sensitivity proved by mutation testing rather than assumed — see the Decisions note. |
| 2026-08-08 | M3 | `server/src/config/{env,db}.ts` | Env loader validates with Zod against the root `.env` and exits 1 naming each offending variable. Five scenarios exercised for real: nothing set, short secret, non-URL URI, valid with defaults applied, and a `mongodb+srv://` Atlas URI (accepted, confirming one `env.ts` serves both local and Atlas). `.env` path resolution verified with a temporary root `.env`, since `../../../` is easy to get wrong. |
| 2026-08-08 | M3 | `server/src/utils/{AppError,response}.ts`, `server/src/middleware/{errorHandler,validate}.ts` | Envelope helpers and error plumbing, transcribed from §8.0/§10.2/§10.3/§9. Exercised by a throwaway supertest harness, 11/11: envelope shapes, `details` omitted when absent, unhandled errors becoming 500 with no stack or path leaking into the body, and validation failures carrying `{ field, message }`. |
| 2026-08-08 | M3 | `server/src/{app,index}.ts`, `types/express.d.ts` | `app.ts` exports the configured app; `index.ts` connects then listens. Unreachable MongoDB exits 1 as Appendix B requires (verified). The probe also confirmed `req.query` is writable under Express 4 — the pin from M1 is load-bearing, not stylistic. |
| 2026-08-08 | M0–M3 | `VERIFICATION.md` | `/verify` full-scope run. Verdict **PASS** — 0 blockers, 0 major, 0 minor. Both packages typecheck, 12/12 tests, prettier clean, zero `any`, calculator still importless, `errorHandler` last, CORS origin explicit, no `res.json()` outside the helpers, no secrets tracked. The `express.d.ts` augmentation was proven live with a positive and a negative compile probe. |
| 2026-08-08 | M4 | `server/src/models/{User,Document}.ts`, `server/src/utils/toJSON.ts` | Both schemas per §5, with `timestamps: true`, both compound indexes, and the unique email index. Mongoose 8 types the `toJSON` `ret` parameter strictly, so the spec's inline transform will not compile; the shared `toJSONTransform` solves it once instead of casting in three schemas. `discount` is a `_id: false` sub-schema, which is also how a field literally named `type` avoids being read as a Mongoose type declaration. |
| 2026-08-08 | M4 | `server/src/validators/auth.validators.ts`, `server/src/routes/auth.routes.ts`, `server/src/utils/asyncHandler.ts`, `app.ts`, `types/express.d.ts` | Register and login per §6, bcryptjs at 12 rounds, mounted at `/api/v1/auth`. Email is normalised in the Zod schema so storage and lookup agree. Login has a single throw site, making the two failure modes identical by construction rather than by matching strings. `express.d.ts` completed with `document?: IDocument` now the model exists. |
| 2026-08-08 | M0–M4 | `VERIFICATION.md`, `server/src/middleware/errorHandler.ts`, `server/src/app.ts` | `/verify --fix` run. **F1 fixed** — malformed JSON returns 400 `VALIDATION_ERROR` instead of 500, keyed on body-parser's `entity.parse.failed` so application `SyntaxError`s still surface as 500 (7/7). **F3 fixed** on follow-up instruction — `/api/v1` catch-all returns 404 `ROUTE_NOT_FOUND` in the envelope instead of Express's HTML page, scoped so `/api-docs` stays free for M6 (7/7). Both probes ran from outside the repository. F2 remains open for M7. One disclosed scope expansion: both findings are Minor and `--fix` is documented for blocker/major only. |
| 2026-08-08 | M0–M4 | `VERIFICATION.md` | `/verify` full-scope run, first under the hardened read-only contract. Verdict **PASS WITH FINDINGS** — 0 blockers, 0 major, 3 minor (F1 malformed JSON → 500, F2 no permanent auth coverage, F3 unmatched-route shape unconfirmed). No process deviations: only `VERIFICATION.md` and `TODO.md` written, confirmed by `git status` before and after. Two checks were reported as `NOT VERIFIABLE IN READ-ONLY MODE` rather than resolved by writing a probe into the tree. Clears Blocker #2, so M4 can close. |
| 2026-08-08 | M4 | (verification) | Throwaway probe against `mongodb-memory-server` + supertest: **26/26**. Covers the envelope, the exact `{ id, email, createdAt }` user shape, bcrypt `$2b$12$` prefix in storage, JWT verifying against the secret with a matching `userId`, 409 on duplicate, 400s with field details, byte-identical 401s, both compound indexes, the unique email index, embedded line-item `_id`→`id`, `discount` defaulting to null, and the status enum rejecting `archived`. Probe deleted afterwards. |

---

## Decisions

Deviations from the spec, and anything a reviewer would otherwise question. Each needs a reason.

| # | Decision | Reason |
| --- | --- | --- |
| 1 | `MILESTONES.md`, `TODO.md`, and `VERIFICATION.md` live at the project root, outside the spec §3 tree. | Build-process artifacts, not application code. Requested by the user so progress survives across sessions. They ship no runtime behaviour and can be removed before submission without touching the app. |
| 2 | `.claude/skills/` is committed with the project. | The user asked for the two skills to be housed in the project rather than user-level, so they travel with the repository. |
| 3 | Prettier config is `{ "singleQuote": true }` rather than bare defaults. | Spec §16.3 allows "default settings (or minimal config)". Every code sample in the spec uses single quotes, so this one setting keeps the implementation byte-identical to the snippets it is meant to reproduce. |
| 4 | `TECHNICAL_SPEC.md`, `MILESTONES.md`, `TODO.md`, `VERIFICATION.md` are in `.prettierignore`. | The spec is the supplied contract and must stay byte-identical; the trackers are rewritten on every task, and letting Prettier reflow their tables would add noise to every diff. |
| 5 | No `build`/`start` script on the server; `dev` runs through `ts-node-dev`. | Appendix C excludes deployment configuration and §18.1.4 lists only install, seed, dev, and test. A compile-to-`dist` pipeline nothing invokes would be dead tooling. |
| 6 | Client uses a single `tsconfig.json` covering `src` and `vite.config.ts`, with `types: ["vite/client", "node"]`. | The usual Vite scaffold splits this into `tsconfig.node.json` plus a `vite-env.d.ts`; naming the types directly gets `import.meta.env` typing with two fewer files, keeping the tree matching spec §3. |
| 7 | `client/index.html` and `client/src/index.css` exist despite not appearing in the spec §3 tree. (`/verify` F2) | Both are structurally required rather than optional: Vite resolves the app from an HTML entry point, and Tailwind v4 is activated by `@import 'tailwindcss'` in a stylesheet. §3 permits files that are absolutely necessary; without these two the client cannot build at all. |
| 8 | `.claude/` is excluded from Prettier. (`/verify` F1) | The skill files are instruction prose, not shipped code. Reflowing them on every format run would churn the diff without improving anything the reviewer reads. |
| 9 | `env.ts` uses `safeParse` with a formatted per-variable message and `process.exit(1)`, not the spec snippet's bare `.parse()`. | §4's mandate is "crash immediately with a clear message indicating which variable is missing or invalid". A raw `ZodError` prints a JSON blob and a stack trace; the formatted list names each variable and its constraint on its own line. Same crash, same no-fallback guarantee, message actually readable. |
| 10 | `errorHandler` takes `_req` and `_next` rather than `req` and `next`. | Express only recognises a function as an error handler if its arity is 4, but both parameters are genuinely unused and `noUnusedParameters` rejects them. The underscore prefix is TypeScript's sanctioned escape and preserves the required arity. |
| 11 | `types/express.d.ts` currently declares only `userId?: string`. | §11.4 also declares `document?: IDocument`, but `models/Document.ts` does not exist until M4; importing it now would not compile. The field is added with the model. |
| 12 | CORS origin hardcoded to `http://localhost:5173` in `app.ts`. | §16.1 requires an explicit origin rather than a bare `cors()`, but §4 fixes the contents of `.env.example` and defines no variable for it. Adding one would deviate from §4; hardcoding the Vite dev origin satisfies §16.1 without touching the env contract. |
| 13 | One `console.log` survives in `index.ts`, printing the listen URL. | §16.3 restricts `console.log` to the error handler and seed script. The startup line is kept because §18.1.4 requires the README to state where the app runs, and a server that prints nothing on boot reads as hung. It is the only one outside the seed script; everything else uses `console.error`. |
| 14 | `app.ts` exports the app without connecting or listening; `src/index.ts` is the entrypoint. | §3's tree lists neither a listen site nor `index.ts`, but supertest must import the app without opening a socket or a database connection, so the two responsibilities have to be separated. `seed.ts` already sits at `src/` root, so the placement is consistent. |
| 15 | `utils/toJSON.ts` added beyond the §3 tree. | Mongoose 8 types the `toJSON` transform's `ret` as `FlatRecord<T> & { _id } & { __v }`, so the spec's `ret.id = ret._id; delete ret._id;` raises TS2339 and TS2790. The alternative is the same four-line cast repeated across the User, line-item and Document schemas; one shared helper fixes it in a single place. |
| 16 | `utils/asyncHandler.ts` added beyond the §3 tree. | Express 4 does not route rejected promises to the error handler, so every `async` route would need its own `try/catch … next(err)`. §17.3 requires database failures to propagate to the global handler and §17.10 forbids repeated boilerplate; a three-line wrapper satisfies both. `express-async-errors` was rejected as it is not in the §2 stack. |
| 17 | `SignOptions['expiresIn']` cast in `signToken`. | Confirmed necessary, not defensive: `@types/jsonwebtoken@9.0.10` types `expiresIn` as `number \| StringValue`, and passing the plain `string` from `env.JWT_EXPIRES_IN` fails with TS2322 (verified by removing the cast). A cast to the library's own type is the narrowest fix and avoids `any`. |
| 21 | New error code `ROUTE_NOT_FOUND` (404) added beyond the §10.4 table, for unmatched paths under `/api/v1`. | Express's default handler answers unknown paths with an HTML page — the one response escaping §8.0's envelope rule, and one a JSON client cannot parse. No existing code fits: `DOCUMENT_NOT_FOUND` would misreport a document lookup that never happened. The name follows the table's convention of naming the missing resource, so it reads as a sibling of `DOCUMENT_NOT_FOUND` and `LINE_ITEM_NOT_FOUND` rather than a generic `NOT_FOUND`. Scoped to `/api/v1` so it can never shadow the HTML Swagger UI serves at `/api-docs` in M6. Added on explicit instruction; §10.4 should be read as extended by this one entry. |
| 20 | Malformed JSON bodies answer `400 VALIDATION_ERROR` rather than a new error code. | §10.4 lists no code for a body that fails to parse, and presents its table as exhaustive. Reusing `VALIDATION_ERROR` slightly stretches its stated meaning (it describes a Zod failure, and a parse error never reaches Zod) but is accurate to the client — the request body was invalid. Inventing `MALFORMED_JSON` would add to a table clients are entitled to treat as complete. The branch matches body-parser's `entity.parse.failed` marker only, so application `SyntaxError`s still surface as 500. |
| 19 | Both skills hardened on 2026-08-08 after two process failures of mine. | (a) The M0–M3 `/verify` run wrote `server/src/__aug.ts` three times to probe the Express type augmentation, despite the skill saying it only reports without `--fix`; deleting it afterwards did not make the run read-only. (b) M4 was flipped to `[x]` without the required verify pass. `/verify` now carries an explicit read-only contract naming the only two writable files and a `NOT VERIFIABLE IN READ-ONLY MODE` escape hatch; `/implement` now gates `[x]` on `VERIFICATION.md` naming that milestone in scope. Both skills now require deviations to be disclosed unprompted, in the turn they occur. |
| 18 | Register keeps the spec's find-then-create and does not map a duplicate-key race to 409. | §6.1 prescribes the existence check; the unique index is the real guarantee. Under a concurrent double-submit the second insert would surface as 500 rather than 409. §17.5 asks for race handling specifically on finalize and is silent here, so the spec's boundary is respected rather than widened. Recorded because a reviewer may notice the asymmetry. |

---

## Blockers

Open problems that stop a task from being verified. Resolve or have the user defer them explicitly; a milestone never closes with one open.

| # | Blocker | Affects | Status |
| --- | --- | --- | --- |
| 1 | MongoDB is not installed locally and nothing listens on 27017. | M8 seed run, live dev server, end-to-end walkthrough | Open — user is installing MongoDB Community 7.x. Does not block M1–M7: the Jest suite uses `mongodb-memory-server`. |
| 2 | M4 was marked `[x]` without the `/verify` pass the skill requires; `VERIFICATION.md` still records only M0–M3. | Closing M4; M5 should not be stacked on an unaudited M4 | **Closed 2026-08-08** — M0–M4 verify run recorded, zero blockers. M4 may now be flipped to `[x]`. |
