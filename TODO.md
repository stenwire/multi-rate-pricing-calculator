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

- [ ] Root `.env.example` (spec §4 verbatim)
- [ ] `server/` npm project: deps, `tsconfig.json`, `jest.config.ts`, `.prettierrc`, scripts
- [ ] `client/` npm project: Vite + React 18 + TypeScript + Tailwind v4, `tsconfig.json`, `vite.config.ts`
- [ ] Confirm Express resolves to 4.x, not 5.x

### M2 — Calculator and its unit tests

- [ ] `services/calculator.ts` — `computeLineItem`, `computeDocumentTotals`, the three §7.5 interfaces
- [ ] `tests/calculator.test.ts` — all ten cases from §14.2
- [ ] §7.6 sample document asserts exactly `45000 / 4000 / 1150 / 42150`

### M3 — Foundation

- [ ] `config/env.ts` (Zod-validated, crashes on invalid) and `config/db.ts`
- [ ] `utils/AppError.ts` and `utils/response.ts`
- [ ] `middleware/errorHandler.ts` and `middleware/validate.ts`
- [ ] `types/express.d.ts`
- [ ] `app.ts` (exports the app, no listen) and `index.ts` (connect + listen)

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

---

## Decisions

Deviations from the spec, and anything a reviewer would otherwise question. Each needs a reason.

| # | Decision | Reason |
| --- | --- | --- |
| 1 | `MILESTONES.md`, `TODO.md`, and `VERIFICATION.md` live at the project root, outside the spec §3 tree. | Build-process artifacts, not application code. Requested by the user so progress survives across sessions. They ship no runtime behaviour and can be removed before submission without touching the app. |
| 2 | `.claude/skills/` is committed with the project. | The user asked for the two skills to be housed in the project rather than user-level, so they travel with the repository. |

---

## Blockers

Open problems that stop a task from being verified. Resolve or have the user defer them explicitly; a milestone never closes with one open.

| # | Blocker | Affects | Status |
| --- | --- | --- | --- |
| 1 | MongoDB is not installed locally and nothing listens on 27017. | M8 seed run, live dev server, end-to-end walkthrough | Open — user is installing MongoDB Community 7.x. Does not block M1–M7: the Jest suite uses `mongodb-memory-server`. |
