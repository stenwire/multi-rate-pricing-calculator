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

### Carry-over from `/verify` 2026-08-08

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

- [ ] `models/User.ts` with `toJSON` stripping `passwordHash`
- [ ] `models/Document.ts` with embedded LineItem sub-schema and both compound indexes
- [ ] `validators/auth.validators.ts`
- [ ] `routes/auth.routes.ts` — register and login

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

---

## Blockers

Open problems that stop a task from being verified. Resolve or have the user defer them explicitly; a milestone never closes with one open.

| # | Blocker | Affects | Status |
| --- | --- | --- | --- |
| 1 | MongoDB is not installed locally and nothing listens on 27017. | M8 seed run, live dev server, end-to-end walkthrough | Open — user is installing MongoDB Community 7.x. Does not block M1–M7: the Jest suite uses `mongodb-memory-server`. |
