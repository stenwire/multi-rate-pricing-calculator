# Multi-Rate Pricing Calculator

## Overview

A web application for building pricing documents from line items, where each line carries its own optional discount (fixed or percentage, never both) and its own tax rate. Every monetary value is calculated on the server and stored as an integer number of cents, so the client only ever displays figures it was given. Documents begin as drafts, can be edited freely, and are finalized in a one-way transition after which the API rejects every mutation. A summary report aggregates finalized documents across a date range.

## Live deployment

| What       | Where                                                           |
| ---------- | --------------------------------------------------------------- |
| Web app    | https://crossval-93f0b.web.app/                                 |
| Swagger UI | https://crossval-api-863312702719.us-central1.run.app/api-docs/ |

The client is on Firebase Hosting and the API on Cloud Run. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for how both are built and released.

## Tech Stack

**Backend** — Node.js 20+, TypeScript 5 (strict), Express 4, MongoDB with Mongoose 8, Zod 3 for request validation, JSON Web Tokens for auth, bcryptjs for password hashing, swagger-jsdoc and swagger-ui-express for the OpenAPI docs, Jest with ts-jest, supertest and mongodb-memory-server for tests.

**Frontend** — React 18, Vite 5, TypeScript, React Router 6, Axios, Tailwind CSS. No component library.

The `server/` and `client/` directories are two independent npm projects. There is no monorepo tooling and no shared package; the handful of types needed on both sides are duplicated deliberately.

## Prerequisites

- **Node.js 20 or later** (developed on 22.14)
- **MongoDB 7 or later**, running locally, or a MongoDB Atlas connection string
- npm 10 or later

`mongosh` is useful for inspecting data but is not required.

## Setup Instructions

```bash
# 1. Clone and enter the project
git clone <repository-url>
cd multi-rate-pricing-calculator

# 2. Create the environment file at the project root
cp .env.example .env
```

Edit `.env` and set at least these two values:

- `MONGODB_URI` — `mongodb://localhost:27017/pricing-calculator` for a local server, or your `mongodb+srv://...` string for Atlas.
- `JWT_SECRET` — any random string of **32 characters or more**. The server refuses to start otherwise.

There is a single `.env` at the project root, not one per package. Both the server and the Vite client read from it.

```bash
# 3. Install dependencies (two separate projects)
cd server && npm install
cd ../client && npm install

# 4. Optional: load sample data
cd ../server && npm run seed
```

The seed creates a user `test@example.com` / `password123` and two documents. Re-running it against a database that already has that user will refuse; use `npm run seed -- --force` to wipe and reseed.

```bash
# 5. Run both halves, in two terminals
cd server && npm run dev     # API on http://localhost:5000
cd client && npm run dev     # UI  on http://localhost:5173
```

Running locally:

| What       | Where                          |
| ---------- | ------------------------------ |
| Web app    | http://localhost:5173          |
| API        | http://localhost:5000/api/v1   |
| Swagger UI | http://localhost:5000/api-docs |

## API Overview

All endpoints are under `/api/v1`. Every response uses the same envelope: `{ status, message, data }` on success, `{ status, message, error_code, details? }` on failure. All routes except registration and login require `Authorization: Bearer <token>`.

| Method | Path                                    | Description                                                    |
| ------ | --------------------------------------- | -------------------------------------------------------------- |
| POST   | `/auth/register`                        | Create an account, returns the user and a JWT                  |
| POST   | `/auth/login`                           | Exchange credentials for a JWT                                 |
| GET    | `/documents`                            | List your documents, with `status`, `page` and `limit` filters |
| POST   | `/documents`                            | Create a draft, optionally with line items                     |
| GET    | `/documents/:id`                        | Fetch one document with its line items and totals              |
| PUT    | `/documents/:id`                        | Update title, customer or issue date — draft only              |
| DELETE | `/documents/:id`                        | Delete a draft                                                 |
| POST   | `/documents/:id/finalize`               | Transition draft to finalized, one way                         |
| POST   | `/documents/:id/line-items`             | Add a line item and recompute totals                           |
| PUT    | `/documents/:id/line-items/:lineItemId` | Update a line item and recompute totals                        |
| DELETE | `/documents/:id/line-items/:lineItemId` | Remove a line item and recompute totals                        |
| GET    | `/reports/summary`                      | Totals across finalized documents in a date range              |

Swagger UI at `/api-docs` documents every parameter, request body and response code.

## Calculation and Rounding Policy

**Money is an integer number of cents, everywhere.** `$100.00` is `10000`. The API accepts and returns integers; the client converts dollars to cents on submit and formats cents for display on render. The only decimals in the system are `taxPercent` and a percentage discount's `value`, because those are rates rather than amounts. Field names are deliberately currency-agnostic — `unitPrice`, not `unitPriceCents` — so adding multi-currency later would need a `currency` field, not a rename.

Per line, in order:

1. `subtotal = quantity × unitPrice`
2. `discountAmount` — for a percentage, `Math.round(subtotal × value / 100)`; for a fixed amount, `Math.min(value, subtotal)`, clamped so a line can never go negative
3. `afterDiscount = subtotal − discountAmount`
4. `taxAmount = Math.round(afterDiscount × taxPercent / 100)` — tax applies to the **discounted** amount
5. `lineTotal = afterDiscount + taxAmount`

`Math.round` is applied at most twice per line, once at each percentage step. **Document totals are exact sums of already-rounded line values, with no further rounding.** That is what makes `grandTotal === subtotal − totalDiscount + totalTax` hold exactly, always.

### Worked example

The document created by `npm run seed`:

| Line        | Qty | Unit price | Discount   | Tax |
| ----------- | --- | ---------- | ---------- | --- |
| Widget A    | 2   | 10000      | 10%        | 5%  |
| Widget B    | 1   | 5000       | none       | 5%  |
| Service fee | 1   | 20000      | 2000 fixed | 0%  |

**Widget A** — subtotal `2 × 10000 = 20000`. Discount `round(20000 × 10 / 100) = 2000`. After discount `18000`. Tax `round(18000 × 5 / 100) = 900`. Line total `18900`.

**Widget B** — subtotal `1 × 5000 = 5000`. No discount, so `0`. After discount `5000`. Tax `round(5000 × 5 / 100) = 250`. Line total `5250`.

**Service fee** — subtotal `1 × 20000 = 20000`. Fixed discount `min(2000, 20000) = 2000`. After discount `18000`. Tax rate is 0, so `0`. Line total `18000`.

**Document** — subtotal `20000 + 5000 + 20000 = 45000`. Total discount `2000 + 0 + 2000 = 4000`. Total tax `900 + 250 + 0 = 1150`. Grand total `18900 + 5250 + 18000 = 42150`.

Check: `45000 − 4000 + 1150 = 42150`. ✓

A rounding example: a line of `1 × 3333` with a 15% discount and 7% tax gives `round(499.95) = 500`, then `3333 − 500 = 2833`, then `round(198.31) = 198`, for a line total of `3031`.

## Document Lifecycle

A document is created as a **draft**. Drafts are fully editable: metadata can change, and line items can be added, updated and removed, with the server recomputing every total on each write.

`POST /documents/:id/finalize` moves a draft to **finalized**. This is one way — there is no route back, and no other status exists.

Finalizing is refused if the document has no line items (`400 NO_LINE_ITEMS`).

Once finalized, the API rejects every mutation with `403 DOCUMENT_FINALIZED`: metadata updates, adding a line item, updating one, removing one, and deleting the document. **Immutability is enforced by the API, not by hiding buttons.** The UI does hide the controls, but that is a convenience; the integration tests assert the API refuses all five operations regardless.

Finalize is race-safe. Rather than reading the status and then writing, it issues a single conditional update filtered on `{ _id, userId, status: 'draft' }`. If two requests arrive together, exactly one matches and succeeds; the loser gets `403` or `409 ALREADY_FINALIZED` depending on which side of the read it lands. There is a test that fires both concurrently and asserts exactly one wins.

## Edge Cases and Decisions

- **A fixed discount larger than the line subtotal** is clamped to the subtotal. The line total becomes `0`, never negative.
- **Percentage and fixed discounts are mutually exclusive** per line. The discount is a single object with one `type`, so having both is structurally impossible.
- **Finalizing with no line items** is rejected with `400 NO_LINE_ITEMS`.
- **Tax is applied after the discount**, to the discounted amount, not the original subtotal.
- **The report counts only finalized documents.** Drafts are excluded. Both date bounds are inclusive, with `endDate` covering the whole of that day.
- **Zero quantities and negative prices** are rejected by validation: `quantity >= 1`, `unitPrice >= 0`.
- **Computed fields sent by a client are ignored, not rejected.** Send `grandTotal: 999999` and the server silently discards it and computes the real value.
- **A document belonging to another user returns `404`, never `403`.** "Not found" and "not yours" are indistinguishable by design, so the API cannot be used to probe for which document ids exist.
- **An invalid ObjectId in a path returns `404`, not `400`** — from the caller's point of view a malformed id simply means no such document.
- **An unknown email and a wrong password produce byte-identical responses** on login, so the API cannot be used to enumerate which addresses have accounts.
- **`INVALID_DATE_RANGE` versus `VALIDATION_ERROR`** — a malformed or missing date fails validation; a well-formed range where `endDate` precedes `startDate` returns `INVALID_DATE_RANGE`.

## Assumptions and Tradeoffs

- **All amounts are USD.** Field names are currency-agnostic so adding multi-currency later needs a `currency` field rather than a schema rename.
- **Line items are embedded** in the document rather than living in their own collection. They are always read and written with their parent, which suits documents of ordinary size. At a scale where documents routinely carry 100+ lines, a separate collection with a `documentId` index would be the better shape.
- **One document belongs to one user.** No sharing, no collaboration, no roles.
- **JWTs with no refresh token.** Access tokens only, stored in `localStorage`, sent as a bearer header.
- **`authenticate` does not hit the database.** The signed token is sufficient; a token outliving its user is accepted scope.
- **No audit log** of document state changes.
- **No rate limiting.**
- **No email verification** on registration.
- **Registration uses check-then-create.** Under a concurrent double-submit of the same email the unique index would surface as a 500 rather than a 409. The specification asks for race handling on finalize specifically, and that is where it was implemented.

## What I Would Improve Before Production

- Refresh token rotation with httpOnly cookies, rather than access tokens in `localStorage`.
- Rate limiting on the auth endpoints.
- An audit log for document state changes, particularly finalization.
- Pagination of line items within very large documents.
- PDF or printable export.
- Duplicating a finalized document into a new draft.
- A CI pipeline running the test suite, typecheck and formatter on every push.
- An input sanitisation library for defence in depth, on top of Zod's validation.
- Monitoring and alerting on error rates and latency.
- Database backups and a tested restore procedure.

## Running Tests

```bash
cd server && npm test
```

76 tests across four suites. No running MongoDB is required — the integration suites start an in-memory server automatically.

| Suite                     | Covers                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculator.test.ts`      | The pure calculation module: every case from the specification, including the sample document, fixed-discount clamping, fractional-cent rounding, and that document totals are exact sums                 |
| `auth.routes.test.ts`     | Registration and login, that the stored password is a bcrypt hash at 12 rounds and never plaintext, that `passwordHash` never appears in a response, and that both login failure modes are byte-identical |
| `document.routes.test.ts` | Document CRUD, ownership isolation returning 404, pagination, the finalize lock across all five mutations, the concurrent-finalize race, and the report counting only finalized documents                 |
| `lineItem.routes.test.ts` | Adding, updating and removing line items with totals recomputed each time, validation rejections, and that mutations are refused on a finalized document                                                  |

Useful variations:

```bash
npm test -- calculator            # one suite by filename
npm test -- -t "fixed discount"   # one test by name
npm run typecheck                 # tsc --noEmit
```

## Deployed URL

Not yet deployed. The application runs locally per the setup instructions above.
