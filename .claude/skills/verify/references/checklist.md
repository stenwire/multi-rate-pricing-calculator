# Audit Checklist

Every item cites the governing section of `TECHNICAL_SPEC.md`. Skip items whose code does not exist yet.

---

## 1. Build and types

- [ ] `npx tsc --noEmit` clean in `server/` and in `client/`
- [ ] Both tsconfigs have `strict: true`, `noUnusedLocals`, `noUnusedParameters` (§16.3)
- [ ] Zero `any` — including `as any`, `<any>`, implicit any from untyped callbacks (§16.3)
- [ ] No `@ts-ignore` or `@ts-expect-error` without a logged Decision
- [ ] `npx prettier --check .` clean; `.prettierrc` present (§16.3)
- [ ] Express resolves to 4.x, not 5.x (§2) — `npm ls express`
- [ ] No banned dependency: Next.js, Nest.js, non-Mongoose ORM, GraphQL, any BaaS, any AI/LLM SDK, MUI/Ant/Chakra, Turborepo/Lerna/workspaces, Docker (§2, §3)

## 2. Tests

- [ ] `npm test` fully green, no skipped or `.only` tests
- [ ] All ten calculator cases from §14.2 exist as real assertions:
      sample document · no discount no tax · percent only · fixed only · fixed clamped ·
      tax only · discount plus tax · fractional-cents rounding · empty array · multi-item summing
- [ ] §7.6 sample asserts exactly `subtotal=45000, totalDiscount=4000, totalTax=1150, grandTotal=42150`
- [ ] Fractional-cents case (qty 1, unitPrice 3333, 15% discount, 7% tax) asserts `500 / 2833 / 198 / 3031`
- [ ] All five integration cases from §14.3 exist:
      four-way finalize lock · finalize with no line items · ownership isolation ·
      quantity 0 rejected · report counts only finalized
- [ ] Finalize-lock test covers all four mutations separately: document update, add line item, update line item, delete line item — each asserting 403 `DOCUMENT_FINALIZED`
- [ ] Tests assert the response envelope and `error_code`, not just the status code
- [ ] Calculator tests touch no database and no HTTP (§14.2)

## 3. Spec conformance

- [ ] Every response goes through `successResponse` / `errorResponse`; **zero** direct `res.json()` in route handlers (§8.0)
- [ ] Error envelope omits `details` entirely when absent — never `null`, never `[]` (§8.0, §10.1)
- [ ] Every code in the §10.4 table is reachable: `VALIDATION_ERROR`, `NO_LINE_ITEMS`, `INVALID_DATE_RANGE`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `DOCUMENT_FINALIZED`, `DOCUMENT_NOT_FOUND`, `LINE_ITEM_NOT_FOUND`, `EMAIL_ALREADY_EXISTS`, `ALREADY_FINALIZED`, `INTERNAL_SERVER_ERROR`
- [ ] `services/calculator.ts` imports nothing from Mongoose, Express, or any I/O layer (§7)
- [ ] Tax applied after discount, on the discounted amount (§7.2)
- [ ] Fixed discount clamped to line subtotal — a line can never go negative (§7.2)
- [ ] `Math.round` used at most twice per line; no rounding at document level (§7.4)
- [ ] `grandTotal === subtotal - totalDiscount + totalTax` holds exactly (§7.4)
- [ ] All money is integer cents; only `taxPercent` and percent-discount `value` are decimals (§7.1)
- [ ] Money field names are currency-agnostic — no `unitPriceCents` (§7.1)
- [ ] File tree matches §3; any extra file has a logged Decision
- [ ] Error handler registered last; startup order matches Appendix B
- [ ] Nothing from Appendix C was built
- [ ] Status transitions `draft` → `finalized` only; no other status value exists anywhere (§5.2)

## 4. Security (§16.1, §6, §11)

- [ ] Client-supplied computed fields are stripped before processing — `subtotal`, `discountAmount`, `afterDiscount`, `taxAmount`, `lineTotal`, document totals — silently ignored, not rejected (§5.2, §8.2)
- [ ] Client-supplied `status` ignored on create and on update (§8.2)
- [ ] `passwordHash` unreachable in every serialization path; `toJSON` transform on `User` (§5.1)
- [ ] Passwords hashed with bcryptjs at 12 rounds; no plain-text password stored or logged (§6.1)
- [ ] Unknown email and wrong password return byte-identical responses — same status, message, and `INVALID_CREDENTIALS` code (§6.2)
- [ ] A document belonging to another user returns 404, never 403 (§8.2, §16.1)
- [ ] Every document query scoped by `userId` **in the query filter**, never post-filtered (§16.1, principle 7)
- [ ] Invalid ObjectId in `:id` yields 404, not 400 (§11.2)
- [ ] `authenticate` rejects missing, malformed, and expired tokens alike with 401 `UNAUTHORIZED` (§11.1)
- [ ] JWT verified with the configured secret; no `algorithms: none`, no unverified `decode()` used for auth
- [ ] CORS configured with an explicit origin — never bare `cors()` (§16.1)
- [ ] `JWT_SECRET` enforced at ≥32 characters; server crashes on a missing or invalid env var (§4)
- [ ] No secret, connection string, or token committed; `.env` is gitignored
- [ ] Error responses leak no stack traces, driver errors, or internal paths (§10.3)
- [ ] Mutation routes cannot bypass the `requireDraft` middleware chain (§8.3)

## 5. Efficiency

- [ ] `{ userId: 1, issueDate: 1 }` and `{ userId: 1, status: 1 }` compound indexes declared (§5.2)
- [ ] Unique index on `users.email` (§5.1)
- [ ] Report uses the `$match`/`$group` aggregation pipeline, not JavaScript summing (§8.4, §16.2)
- [ ] Documents list paginates; `limit` bounded 1–100 with a default of 20 (§8.1)
- [ ] Pagination `total` comes from a `countDocuments` on the same filter, not from fetching everything
- [ ] One save per mutation — no read-modify-read-save cycles, no double `save()`
- [ ] `loadDocument` result reused by the handler rather than re-queried
- [ ] Document totals recomputed from line items in a single pass, not per-item queries
- [ ] No N+1 across any route

## 6. DRY and simplicity

- [ ] Money math exists **only** in `calculator.ts` — nowhere in routes, models, seed, or client
- [ ] Line-item compute-and-recompute logic is shared, not copy-pasted across add / update / delete
- [ ] Validators reuse a shared base schema rather than restating field rules
- [ ] Route handlers are thin: validate → calculator or service → respond (§17 principle 4)
- [ ] No dead code, commented-out blocks, unused imports, or never-called functions (§17 principle 10)
- [ ] No comment that restates the code; no file-header or section-separator comments (§16.4)
- [ ] Non-obvious business logic *is* commented — clamping, race handling (§16.4)
- [ ] `console.log` only in the seed script; errors use `console.error` (§16.3)
- [ ] No duplicated literal error strings or codes that should be shared constants

## 7. Frontend (once `client/` exists)

- [ ] Client never computes a total — every displayed figure comes from the API response (§17 principle 2)
- [ ] Dollar→cent conversion happens only at submit, via `Math.round(parseFloat(v) * 100)` (§12.4)
- [ ] `utils/format.ts` matches §12.7
- [ ] Axios request interceptor attaches `Authorization: Bearer <token>` (§12.2)
- [ ] Axios response interceptor clears auth state and redirects to `/login` on 401 (§12.2)
- [ ] `ProtectedRoute` guards all six authenticated routes (§12.1)
- [ ] A finalized document renders no edit controls, and shows a finalized badge (§12.5)
- [ ] Finalize prompts for confirmation before firing (§12.5)
- [ ] Styling is consistently Tailwind; no component library (§2)
- [ ] Token read from localStorage; nothing else sensitive stored there (§6.3)
- [ ] API errors surface the envelope `message` to the user rather than a raw exception

## 8. Documentation

- [ ] `README.md` has all twelve §18.1 sections under their exact headers
- [ ] README carries the worked calculation example with real numbers (§18.1.6)
- [ ] README documents the rounding policy, document lifecycle, edge cases, and tradeoffs (§18.1.6–9)
- [ ] `.env.example` matches §4 and lists every variable the code actually reads
- [ ] Swagger reachable at `/api-docs` with no auth (§13.4)
- [ ] All ten component schemas from §13.3 defined
- [ ] Every endpoint documents parameters, request body, all response codes, and `bearerAuth` where required (§13.2)
