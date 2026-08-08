# Multi-Rate Pricing Calculator: Technical Specification & FRD

## Document Purpose

This is a complete implementation specification for a Multi-Rate Pricing Calculator web application. It is a take-home assignment for a Full Stack Developer role. The implementor (Claude Code) must follow this document exactly. Do not make assumptions. If something is not specified here, it is not required. If something IS specified here, it is mandatory.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack (Exact)](#2-tech-stack-exact)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Authentication](#6-authentication)
7. [Calculation Engine](#7-calculation-engine)
8. [API Specification](#8-api-specification)
9. [Validation Rules](#9-validation-rules)
10. [Error Handling](#10-error-handling)
11. [Middleware](#11-middleware)
12. [Frontend Requirements](#12-frontend-requirements)
13. [Swagger / OpenAPI Docs](#13-swagger--openapi-docs)
14. [Testing Requirements](#14-testing-requirements)
15. [Seed Data](#15-seed-data)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Engineering Principles](#17-engineering-principles)
18. [README Requirements](#18-readme-requirements)

---

## 1. Project Overview

Build a web application where authenticated users create documents with line items. Each line item can have a per-line discount (fixed OR percent, never both) and a per-line tax rate. The system computes all totals server-side, enforces a draft/finalized lifecycle, and provides a summary report filtered by date range.

This is NOT a tax compliance tool. No tax lookup tables, no jurisdiction logic. Tax is just a user-supplied percentage per line item.

### What "done" means

- A user can register, log in, create a document with line items, see computed totals, finalize the document, and view a summary report for a date range.
- All monetary math is correct and matches the sample data in Section 15.
- Finalized documents are immutable via API (not just hidden buttons).
- Swagger UI is accessible at `/api-docs`.
- Tests pass for the calculation module and lock enforcement.
- The app runs locally with a single setup sequence documented in the README.

---

## 2. Tech Stack (Exact)

### Backend

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js >= 20 | Use LTS |
| Language | TypeScript 5.x | Strict mode enabled in tsconfig |
| Framework | Express 4.x | Do NOT use Express 5 beta |
| Database | MongoDB 7.x via MongoDB Atlas or local | Use `mongodb-memory-server` for tests |
| ODM | Mongoose 8.x | |
| Validation | Zod 3.x | All request bodies validated via Zod schemas |
| Auth | JSON Web Tokens (jsonwebtoken) | Access tokens only; no refresh tokens |
| Password hashing | bcryptjs | 12 salt rounds |
| Swagger | swagger-jsdoc 6.x + swagger-ui-express 5.x | OpenAPI 3.0.3 spec |
| Testing | Jest + ts-jest | |
| Environment | dotenv | |
| CORS | cors package | Allow the frontend origin |

### Frontend

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 18.x | |
| Bundler | Vite 5.x | |
| Language | TypeScript | |
| HTTP client | Axios | Create a configured instance with base URL and auth interceptor |
| Routing | React Router v6 | |
| Styling | CSS Modules or Tailwind CSS (pick one, be consistent) | No component libraries (no MUI, no Ant Design, no Chakra) |
| Charts | Recharts | For the summary report chart (only if a chart is added as a stretch) |

### Do NOT use

- Next.js, Nest.js, or any meta-framework
- Any ORM other than Mongoose
- GraphQL
- Firebase, Supabase, or any BaaS
- Any AI/LLM integration
- Docker (keep setup simple: `npm install` + `npm run dev`)

---

## 3. Project Structure

```
multi-rate-pricing-calculator/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                  # Mongoose connection logic
│   │   │   └── env.ts                 # Environment variable loader and validator
│   │   ├── middleware/
│   │   │   ├── authenticate.ts        # JWT verification, sets req.userId
│   │   │   ├── loadDocument.ts        # Fetches document by :id param, verifies ownership
│   │   │   ├── requireDraft.ts        # Rejects if document.status !== 'draft'
│   │   │   ├── validate.ts            # Generic Zod validation middleware factory
│   │   │   └── errorHandler.ts        # Global error handler (last middleware)
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   └── Document.ts            # Includes embedded LineItem sub-schema
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── document.routes.ts
│   │   │   ├── lineItem.routes.ts
│   │   │   └── report.routes.ts
│   │   ├── services/
│   │   │   └── calculator.ts          # Pure calculation functions (ZERO side effects)
│   │   ├── validators/
│   │   │   ├── auth.validators.ts
│   │   │   ├── document.validators.ts
│   │   │   ├── lineItem.validators.ts
│   │   │   └── report.validators.ts
│   │   ├── types/
│   │   │   └── express.d.ts           # Extend Express Request with userId and document
│   │   ├── utils/
│   │   │   ├── AppError.ts            # Custom error class with statusCode and code
│   │   │   └── response.ts            # successResponse() and errorResponse() helpers
│   │   ├── swagger.ts                 # swagger-jsdoc config and setup
│   │   └── app.ts                     # Express app setup (middleware, routes, error handler)
│   ├── tests/
│   │   ├── calculator.test.ts         # Unit tests for calculation module
│   │   ├── document.routes.test.ts    # Integration tests for document CRUD + finalize
│   │   └── lineItem.routes.test.ts    # Integration tests for line item mutations + lock
│   ├── tsconfig.json
│   ├── jest.config.ts
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts              # Axios instance with interceptor
│   │   ├── context/
│   │   │   └── AuthContext.tsx         # Auth state, login/logout/register functions
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DocumentsListPage.tsx
│   │   │   ├── DocumentDetailPage.tsx
│   │   │   ├── CreateDocumentPage.tsx
│   │   │   └── ReportPage.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx             # Nav bar, auth-aware links
│   │   │   ├── ProtectedRoute.tsx     # Redirects to /login if not authenticated
│   │   │   ├── LineItemForm.tsx       # Form to add/edit a line item
│   │   │   ├── LineItemsTable.tsx     # Displays line items with computed values
│   │   │   ├── DocumentTotals.tsx     # Displays document-level totals
│   │   │   └── ReportSummary.tsx      # Report table display
│   │   ├── utils/
│   │   │   └── format.ts             # formatMoney, formatDate
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
├── .gitignore
├── .env.example
└── README.md
```

**Rules:**

- Do NOT create any files outside of this structure unless absolutely necessary (e.g., a tsconfig.base.json at root).
- Do NOT create a `/shared` or `/common` package. The frontend and backend are separate npm projects with no shared code. If a type is needed on both sides, duplicate it. This is intentional for simplicity.
- No monorepo tooling (no Turborepo, no Lerna, no npm workspaces).

---

## 4. Environment Variables

Create a `.env.example` file at the project root:

```env
# Server
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pricing-calculator
JWT_SECRET=change-this-to-a-random-64-char-string
JWT_EXPIRES_IN=7d

# Client
VITE_API_URL=http://localhost:5000/api/v1
```

In `server/src/config/env.ts`, load and validate these using Zod:

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

export const env = envSchema.parse(process.env);
```

If validation fails, the server must crash immediately with a clear message indicating which variable is missing or invalid. No silent fallbacks.

---

## 5. Database Schema

### 5.1 User Model

File: `server/src/models/User.ts`

```
Collection name: users

Fields:
  email:         String, required, unique, lowercase, trimmed
  passwordHash:  String, required
  createdAt:     Date, auto (Mongoose timestamps)
  updatedAt:     Date, auto (Mongoose timestamps)

Indexes:
  { email: 1 } unique index (handled by Mongoose unique: true)

NEVER store plain-text passwords. NEVER return passwordHash in any API response.
Use a Mongoose toJSON transform to strip passwordHash and __v from serialized output.
```

### 5.2 Document Model

File: `server/src/models/Document.ts`

```
Collection name: documents

Fields:
  userId:              ObjectId, required, ref: 'User'
  title:               String, required, trimmed, maxlength: 200
  customer:            String, required, trimmed, maxlength: 200
  issueDate:           Date, required
  status:              String, enum: ['draft', 'finalized'], default: 'draft'
  lineItems:           Array of LineItem subdocuments (see below)
  subtotal:       Number, required, default: 0
  totalDiscount:  Number, required, default: 0
  totalTax:       Number, required, default: 0
  grandTotal:     Number, required, default: 0
  createdAt:           Date, auto (Mongoose timestamps)
  updatedAt:           Date, auto (Mongoose timestamps)

Indexes:
  { userId: 1, issueDate: 1 }   compound index (report queries)
  { userId: 1, status: 1 }      compound index (dashboard filtering)

LineItem subdocument schema:
  _id:                  ObjectId, auto-generated by Mongoose
  description:          String, required, trimmed, maxlength: 300
  quantity:             Number, required, min: 1 (integer, validated via Zod)
  unitPrice:       Number, required, min: 0 (integer)
  discount:             Object or null, default: null
    type:               String, enum: ['percent', 'fixed']
    value:              Number, required
                        If type === 'percent': min 0, max 100 (can be decimal, e.g., 12.5)
                        If type === 'fixed': min 0 (integer, in cents)
  taxPercent:           Number, default: 0, min: 0, max: 100 (can be decimal)
  subtotal:        Number, required
  discountAmount:  Number, required
  afterDiscount:   Number, required
  taxAmount:       Number, required
  lineTotal:       Number, required
```

**Critical rules for the Document model:**

1. All computed monetary fields are calculated server-side on every write (create, add/update/remove line item). The client NEVER sends these values. If the client includes them in a request body, ignore them silently (strip from input before processing).
2. Line items are embedded, not referenced. They are always read and written with their parent document.
3. The `status` field can only transition from `'draft'` to `'finalized'`. There is no reverse transition. There is no `'archived'`, `'deleted'`, or any other status.
4. Use Mongoose `timestamps: true` for automatic `createdAt` and `updatedAt`.
5. Apply a `toJSON` transform that converts `_id` to `id` and removes `__v` for cleaner API responses.

---

## 6. Authentication

### 6.1 Registration

1. Accept `email` and `password` in the request body.
2. Validate email format (Zod `.email()`). Validate password: minimum 8 characters.
3. Check if a user with this email already exists. If yes, return 409 with error code `EMAIL_ALREADY_EXISTS`.
4. Hash the password with bcryptjs (12 salt rounds).
5. Create the user document.
6. Return 201 with the user object (email, id, createdAt) and a JWT token.

### 6.2 Login

1. Accept `email` and `password`.
2. Find user by email. If not found, return 401 with error code `INVALID_CREDENTIALS`. Do NOT say "user not found" (information leak).
3. Compare password with stored hash. If mismatch, return 401 with `INVALID_CREDENTIALS`. Use the same error message and code as "user not found" so attackers cannot distinguish.
4. Generate a JWT containing `{ userId: user._id }` with the configured expiry.
5. Return 200 with the user object and the token.

### 6.3 JWT Token

- Payload: `{ userId: string }` (the MongoDB _id as a string).
- Signed with `JWT_SECRET` from env.
- Expiry from `JWT_EXPIRES_IN` env var.
- Sent to the client in the response body (not cookies).
- The client stores it in localStorage and sends it as `Authorization: Bearer <token>` on every request.
- The `authenticate` middleware verifies the token and attaches `req.userId` (as a string). If the token is missing, malformed, or expired, return 401 with error code `UNAUTHORIZED`.

---

## 7. Calculation Engine

File: `server/src/services/calculator.ts`

This is the most critical file in the project. It must be a pure module with ZERO imports from Mongoose, Express, or any I/O layer. It receives plain objects and returns plain objects. This is what makes it fully unit-testable.

### 7.1 Money Representation

ALL monetary values are stored and computed as **integers representing the smallest currency unit** (cents). For this project, all amounts are in USD. This eliminates floating-point precision issues entirely.

Field names are intentionally currency-agnostic (e.g., `unitPrice`, `subtotal`, `grandTotal` rather than `unitPriceCents` or `unitPriceDollars`). This means adding multi-currency support in the future would require only a `currency` field on the document, not a field-naming migration.

The API accepts and returns integer values in the smallest unit (so $100.00 = 10000). The frontend converts to display format on render.

One exception: `taxPercent` and percent discount `value` are regular numbers (not cents), because they are percentages, not currency amounts. They can be decimals (e.g., 12.5% is stored as `12.5`).

### 7.2 Per-Line Calculation

```
Input: quantity, unitPrice, discount (type + value) or null, taxPercent

Step 1: subtotal = quantity * unitPrice

Step 2: Compute discountAmount
  - If discount is null or undefined: discountAmount = 0
  - If discount.type === 'percent':
      discountAmount = Math.round(subtotal * discount.value / 100)
  - If discount.type === 'fixed':
      discountAmount = Math.min(discount.value, subtotal)
      (Clamp to subtotal; a fixed discount cannot make the line negative)

Step 3: afterDiscount = subtotal - discountAmount

Step 4: Compute taxAmount
  - If taxPercent is 0 or undefined: taxAmount = 0
  - Otherwise: taxAmount = Math.round(afterDiscount * taxPercent / 100)
  - Tax is applied AFTER discount, on the discounted amount

Step 5: lineTotal = afterDiscount + taxAmount
```

### 7.3 Document-Level Calculation

```
Input: array of line item computation results

subtotal     = SUM of all line subtotal
totalDiscount = SUM of all line discountAmount
totalTax      = SUM of all line taxAmount
grandTotal    = SUM of all line lineTotal

No further rounding at the document level. Document totals are exact integer sums of already-rounded line values.
```

### 7.4 Rounding Policy

- Round to the nearest cent using `Math.round()` at each per-line step where a percentage is applied (discount amount and tax amount).
- Rounding happens at most twice per line (once for discount, once for tax).
- Document totals are exact sums of rounded line values. No rounding at the document level.
- This means: `grandTotal === subtotal - totalDiscount + totalTax` will always hold exactly.

### 7.5 Exported Functions

```typescript
// Types (export these)

interface LineItemInput {
  quantity: number;
  unitPrice: number;
  discount?: {
    type: 'percent' | 'fixed';
    value: number;
  } | null;
  taxPercent?: number;
}

interface LineItemResult {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  lineTotal: number;
}

interface DocumentTotals {
  lineResults: LineItemResult[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

// Functions (export these)

function computeLineItem(input: LineItemInput): LineItemResult
function computeDocumentTotals(lineItems: LineItemInput[]): DocumentTotals
```

### 7.6 Verification Against Sample Data

The calculator MUST produce these exact results for the sample document:

```
Widget A: qty=2, unitPrice=10000, discount={type:'percent', value:10}, taxPercent=5
  subtotal=20000, discountAmount=2000, afterDiscount=18000, taxAmount=900, lineTotal=18900

Widget B: qty=1, unitPrice=5000, discount=null, taxPercent=5
  subtotal=5000, discountAmount=0, afterDiscount=5000, taxAmount=250, lineTotal=5250

Service fee: qty=1, unitPrice=20000, discount={type:'fixed', value:2000}, taxPercent=0
  subtotal=20000, discountAmount=2000, afterDiscount=18000, taxAmount=0, lineTotal=18000

Document totals:
  subtotal=45000, totalDiscount=4000, totalTax=1150, grandTotal=42150
```

Include a test that asserts these exact values. If the calculator does not produce these numbers, the implementation is wrong.

---

## 8. API Specification

Base path: `/api/v1`

All endpoints return JSON. All request bodies are JSON (`Content-Type: application/json`).

All authenticated endpoints require `Authorization: Bearer <token>` header.

### 8.0 Response Envelope

Every API response MUST be wrapped in a standard envelope. There are two shapes: success and error. No endpoint may return a raw object outside this envelope.

**Success response:**
```json
{
  "status": "success",
  "message": "Human-readable description of what happened.",
  "data": { ... }
}
```

`data` contains the actual payload (document, user, report summary, etc.). For delete operations where there is no meaningful data to return, `data` is `null`.

**Error response:**
```json
{
  "status": "error",
  "message": "Human-readable description of the problem.",
  "error_code": "SCREAMING_SNAKE_CASE_ERROR_CODE",
  "details": [ ... ]
}
```

`details` is optional. For validation errors, it contains the array of `{ field, message }` objects. For other errors, omit it entirely (do not send an empty array or null).

Create two response helper utilities in `server/src/utils/response.ts`:

```typescript
import { Response } from 'express';

export function successResponse(res: Response, statusCode: number, message: string, data: unknown = null) {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
}

export function errorResponse(res: Response, statusCode: number, message: string, errorCode: string, details?: unknown) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    error_code: errorCode,
    ...(details !== undefined && { details }),
  });
}
```

All route handlers and the global error handler MUST use these helpers. No route handler may call `res.json()` directly.

### 8.1 Auth Routes

**POST /api/v1/auth/register**

Request body:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Success response (201):
```json
{
  "status": "success",
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": "664a1b2c3d4e5f6a7b8c9d0e",
      "email": "user@example.com",
      "createdAt": "2026-08-08T10:00:00.000Z"
    },
    "token": "eyJhbGciOi..."
  }
}
```

Error responses:
- 400: Validation error (invalid email format, password too short)
- 409: `EMAIL_ALREADY_EXISTS`

---

**POST /api/v1/auth/login**

Request body:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Success response (200):
```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "664a1b2c3d4e5f6a7b8c9d0e",
      "email": "user@example.com",
      "createdAt": "2026-08-08T10:00:00.000Z"
    },
    "token": "eyJhbGciOi..."
  }
}
```

Error responses:
- 400: Validation error
- 401: `INVALID_CREDENTIALS`

---

### 8.2 Document Routes

All require authentication.

**GET /api/v1/documents**

Query params (all optional):
- `status`: `'draft'` or `'finalized'` (filter)
- `page`: integer >= 1, default 1
- `limit`: integer 1-100, default 20

Success response (200):
```json
{
  "status": "success",
  "message": "Documents retrieved successfully.",
  "data": {
    "documents": [
      {
        "id": "...",
        "title": "Q1 Services",
        "customer": "Acme Corp",
        "issueDate": "2026-01-15T00:00:00.000Z",
        "status": "draft",
        "lineItems": [...],
        "subtotal": 45000,
        "totalDiscount": 4000,
        "totalTax": 1150,
        "grandTotal": 42150,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Scope: only returns documents where `userId` matches the authenticated user. This is enforced at the query level, not post-filter.

---

**POST /api/v1/documents**

Creates a new draft document. Line items can optionally be included at creation time.

Request body:
```json
{
  "title": "Q1 Services",
  "customer": "Acme Corp",
  "issueDate": "2026-01-15",
  "lineItems": [
    {
      "description": "Widget A",
      "quantity": 2,
      "unitPrice": 10000,
      "discount": { "type": "percent", "value": 10 },
      "taxPercent": 5
    }
  ]
}
```

`lineItems` is optional. If omitted, the document is created with an empty array and all totals at 0.

If `lineItems` is provided, run each through the calculator, store computed values, and compute document totals.

The API MUST ignore any computed monetary fields if the client sends them in `lineItems`. Only accept: `description`, `quantity`, `unitPrice`, `discount`, `taxPercent`.

`status` is always `'draft'` on creation. If the client sends a `status` field, ignore it.

Success response (201):
```json
{
  "status": "success",
  "message": "Document created successfully.",
  "data": { ... }
}
```

The `data` field contains the full document object (same shape as GET detail).

Error responses:
- 400: Validation error
- 401: Unauthorized

---

**GET /api/v1/documents/:id**

Success response (200):
```json
{
  "status": "success",
  "message": "Document retrieved successfully.",
  "data": { ... }
}
```

The `data` field contains the full document object with line items and computed totals.

Error responses:
- 401: Unauthorized
- 404: `DOCUMENT_NOT_FOUND` (also returned if the document exists but belongs to a different user; do NOT distinguish between "not found" and "not yours")

---

**PUT /api/v1/documents/:id**

Update document metadata. Draft only.

Request body (all fields optional, but at least one required):
```json
{
  "title": "Updated Title",
  "customer": "New Customer",
  "issueDate": "2026-02-01"
}
```

This endpoint DOES NOT accept `lineItems`, `status`, or any computed fields. If sent, ignore them.

Uses middleware chain: authenticate -> loadDocument -> requireDraft.

Success response (200):
```json
{
  "status": "success",
  "message": "Document updated successfully.",
  "data": { ... }
}
```

Error responses:
- 400: Validation error or empty body
- 401: Unauthorized
- 403: `DOCUMENT_FINALIZED` (if status is 'finalized')
- 404: `DOCUMENT_NOT_FOUND`

---

**DELETE /api/v1/documents/:id**

Delete a document. Draft only.

Uses middleware chain: authenticate -> loadDocument -> requireDraft.

Success response (200):
```json
{
  "status": "success",
  "message": "Document deleted successfully.",
  "data": null
}
```

Error responses:
- 401: Unauthorized
- 403: `DOCUMENT_FINALIZED`
- 404: `DOCUMENT_NOT_FOUND`

---

**POST /api/v1/documents/:id/finalize**

Transition a document from draft to finalized.

Uses middleware chain: authenticate -> loadDocument -> requireDraft.

Finalize validation: reject if the document has zero line items. Return 400 with error code `NO_LINE_ITEMS` and message "Cannot finalize a document with no line items."

Use `findOneAndUpdate` with filter `{ _id: id, status: 'draft' }` and update `{ $set: { status: 'finalized' } }` to handle race conditions. If the update matches zero documents, another request already finalized it; return 409 with error code `ALREADY_FINALIZED`.

Success response (200):
```json
{
  "status": "success",
  "message": "Document finalized successfully.",
  "data": { ... }
}
```

The `data` field contains the updated document object with `status: 'finalized'`.

Error responses:
- 400: `NO_LINE_ITEMS`
- 401: Unauthorized
- 403: `DOCUMENT_FINALIZED`
- 404: `DOCUMENT_NOT_FOUND`
- 409: `ALREADY_FINALIZED` (race condition)

---

### 8.3 Line Item Routes

All require authentication. All use middleware chain: authenticate -> loadDocument -> requireDraft.

All line item mutations MUST recompute document totals after the change and save the document.

**POST /api/v1/documents/:id/line-items**

Add a line item to a draft document.

Request body:
```json
{
  "description": "Widget A",
  "quantity": 2,
  "unitPrice": 10000,
  "discount": { "type": "percent", "value": 10 },
  "taxPercent": 5
}
```

Field rules:
- `description`: required, string, trimmed, 1-300 characters
- `quantity`: required, integer, >= 1
- `unitPrice`: required, integer, >= 0
- `discount`: optional, default null
  - If provided: `type` must be `'percent'` or `'fixed'`, `value` must be a number >= 0
  - If `type === 'percent'`: `value` must be <= 100
  - If `type === 'fixed'`: `value` must be an integer (cents)
  - Do NOT allow both `type: 'percent'` and `type: 'fixed'` simultaneously (this is structurally impossible given the schema, but validate that `type` is one of the two enum values)
- `taxPercent`: optional, number, default 0, >= 0, <= 100

Process:
1. Validate input.
2. Compute line item values using the calculator.
3. Merge input fields with computed fields to create the subdocument.
4. Push the subdocument to `document.lineItems`.
5. Recompute document totals from all line items.
6. Save the document.
7. Return the full updated document.

Success response (201):
```json
{
  "status": "success",
  "message": "Line item added successfully.",
  "data": { ... }
}
```

The `data` field contains the full updated document object.

Error responses:
- 400: Validation error (with specific field-level messages)
- 401: Unauthorized
- 403: `DOCUMENT_FINALIZED`
- 404: `DOCUMENT_NOT_FOUND`

---

**PUT /api/v1/documents/:id/line-items/:lineItemId**

Update an existing line item.

Request body: same shape as POST, all fields optional (partial update).

Process:
1. Find the line item by `lineItemId` in `document.lineItems`. If not found, return 404 with code `LINE_ITEM_NOT_FOUND`.
2. Merge provided fields into the existing line item data.
3. Recompute that line item's values using the calculator.
4. Recompute document totals from all line items.
5. Save and return the full updated document.

Success response (200):
```json
{
  "status": "success",
  "message": "Line item updated successfully.",
  "data": { ... }
}
```

The `data` field contains the full updated document object.

Error responses:
- 400: Validation error
- 401: Unauthorized
- 403: `DOCUMENT_FINALIZED`
- 404: `DOCUMENT_NOT_FOUND` or `LINE_ITEM_NOT_FOUND`

---

**DELETE /api/v1/documents/:id/line-items/:lineItemId**

Remove a line item.

Process:
1. Find and remove the line item by `lineItemId`. If not found, return 404 with `LINE_ITEM_NOT_FOUND`.
2. Recompute document totals from remaining line items.
3. Save and return the full updated document.

Success response (200):
```json
{
  "status": "success",
  "message": "Line item removed successfully.",
  "data": { ... }
}
```

The `data` field contains the full updated document object.

Error responses:
- 401: Unauthorized
- 403: `DOCUMENT_FINALIZED`
- 404: `DOCUMENT_NOT_FOUND` or `LINE_ITEM_NOT_FOUND`

---

### 8.4 Report Route

**GET /api/v1/reports/summary**

Query params:
- `startDate` (required): string, ISO date format `YYYY-MM-DD`
- `endDate` (required): string, ISO date format `YYYY-MM-DD`

Validation:
- Both params are required. Return 400 if either is missing.
- `endDate` must be >= `startDate`. Return 400 if not.
- Parse dates: `startDate` is inclusive (>= start of day), `endDate` is inclusive (<= end of day).

Query: aggregate all **finalized** documents where `issueDate` falls within the range AND `userId` matches the authenticated user.

Success response (200):
```json
{
  "status": "success",
  "message": "Report generated successfully.",
  "data": {
    "summary": {
      "startDate": "2026-01-01",
      "endDate": "2026-03-31",
      "documentCount": 5,
      "subtotal": 150000,
      "totalDiscount": 12000,
      "totalTax": 7500,
      "grandTotal": 145500
    }
  }
}
```

Use a MongoDB aggregation pipeline:
```
$match: { userId, status: 'finalized', issueDate: { $gte: startDate, $lte: endDate } }
$group: {
  _id: null,
  documentCount: { $sum: 1 },
  subtotal: { $sum: '$subtotal' },
  totalDiscount: { $sum: '$totalDiscount' },
  totalTax: { $sum: '$totalTax' },
  grandTotal: { $sum: '$grandTotal' }
}
```

If no documents match, return all numeric fields as 0 and documentCount as 0.

Error responses:
- 400: Validation error (missing dates, invalid format, endDate before startDate)
- 401: Unauthorized

---

## 9. Validation Rules

Use Zod for all request validation. Create a generic validation middleware factory:

File: `server/src/middleware/validate.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { errorResponse } from '../utils/response';

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return errorResponse(res, 400, 'Request validation failed.', 'VALIDATION_ERROR', errors);
    }
    req[source] = result.data;
    next();
  };
}
```

### Specific Zod Schemas

**Auth:**
- `registerSchema`: email (z.string().email()), password (z.string().min(8))
- `loginSchema`: same shape

**Create Document:**
- `title`: z.string().trim().min(1).max(200)
- `customer`: z.string().trim().min(1).max(200)
- `issueDate`: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) then validated as a real date (e.g., reject "2026-02-30")
- `lineItems`: z.array(lineItemInputSchema).optional().default([])

**Update Document:**
- All fields optional, but at least one must be present (use `.refine()` to enforce this)
- Same field validations as create for any field that is present

**Line Item Input:**
- `description`: z.string().trim().min(1).max(300)
- `quantity`: z.number().int().min(1)
- `unitPrice`: z.number().int().min(0)
- `discount`: z.object({ type: z.enum(['percent', 'fixed']), value: z.number().min(0) }).nullable().optional().default(null)
  - Refine: if type === 'percent', value <= 100
  - Refine: if type === 'fixed', value must be an integer (Math.floor(value) === value)
- `taxPercent`: z.number().min(0).max(100).optional().default(0)

**Update Line Item:**
- Same fields as line item input, but all optional. Use `.partial()` on the create schema (minus the defaults).
- At least one field must be present.

**Report Query:**
- `startDate`: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
- `endDate`: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
- Refine: endDate >= startDate
- Validate that both parse to real dates

---

## 10. Error Handling

### 10.1 Error Shape

Every error response MUST follow the standard error envelope defined in Section 8.0:

```json
{
  "status": "error",
  "message": "Human-readable message describing the problem.",
  "error_code": "ERROR_CODE_IN_SCREAMING_SNAKE_CASE",
  "details": [...]
}
```

`details` is optional. For validation errors, it contains the array of `{ field, message }` objects. For other errors, omit it entirely.

### 10.2 Custom Error Class

File: `server/src/utils/AppError.ts`

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 10.3 Global Error Handler

File: `server/src/middleware/errorHandler.ts`

This is the LAST middleware registered on the Express app.

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { errorResponse } from '../utils/response';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return errorResponse(res, err.statusCode, err.message, err.code, err.details);
  }

  console.error('Unhandled error:', err);
  return errorResponse(res, 500, 'An unexpected error occurred.', 'INTERNAL_SERVER_ERROR');
}
```

### 10.4 Error Code Reference

| HTTP Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body or query params fail Zod validation |
| 400 | `NO_LINE_ITEMS` | Attempt to finalize a document with no line items |
| 400 | `INVALID_DATE_RANGE` | endDate before startDate, or invalid date format |
| 401 | `UNAUTHORIZED` | Missing, malformed, or expired JWT |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password on login |
| 403 | `DOCUMENT_FINALIZED` | Attempt to mutate a finalized document |
| 404 | `DOCUMENT_NOT_FOUND` | Document does not exist or does not belong to user |
| 404 | `LINE_ITEM_NOT_FOUND` | Line item ID not found within the document |
| 409 | `EMAIL_ALREADY_EXISTS` | Registration with an existing email |
| 409 | `ALREADY_FINALIZED` | Race condition on finalize |
| 500 | `INTERNAL_SERVER_ERROR` | Unhandled exceptions |

---

## 11. Middleware

### 11.1 authenticate

File: `server/src/middleware/authenticate.ts`

1. Extract the `Authorization` header.
2. Verify it starts with `Bearer `.
3. Verify the token using `jsonwebtoken.verify()` with `JWT_SECRET`.
4. Extract `userId` from the payload.
5. Attach `req.userId = userId` (as a string).
6. Call `next()`.
7. On any failure: throw `new AppError(401, 'UNAUTHORIZED', 'Authentication required.')`.

Do NOT query the database to check if the user still exists on every request. The JWT is sufficient for authentication. If a user is deleted, their token becomes orphaned; this is acceptable for this project's scope.

### 11.2 loadDocument

File: `server/src/middleware/loadDocument.ts`

1. Extract `req.params.id`.
2. Validate that it is a valid MongoDB ObjectId format. If not, throw `AppError(404, 'DOCUMENT_NOT_FOUND', ...)`. Do NOT return a 400 for an invalid ID format; from the client's perspective, an invalid ID simply means the document does not exist.
3. Query: `Document.findOne({ _id: id, userId: req.userId })`.
4. If not found, throw `AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.')`.
5. Attach `req.document = document` to the request.
6. Call `next()`.

### 11.3 requireDraft

File: `server/src/middleware/requireDraft.ts`

1. Check `req.document.status`.
2. If not `'draft'`, throw `AppError(403, 'DOCUMENT_FINALIZED', 'Cannot modify a finalized document.')`.
3. Call `next()`.

### 11.4 Express Type Extension

File: `server/src/types/express.d.ts`

```typescript
import { IDocument } from '../models/Document';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      document?: IDocument;
    }
  }
}
```

---

## 12. Frontend Requirements

The frontend is functional, not fancy. Spend minimal time on styling. The evaluation is backend-heavy. The frontend must work correctly and be usable, but visual polish is not the priority.

### 12.1 Pages and Routes

| Route | Page | Auth Required |
|---|---|---|
| `/login` | Login form | No |
| `/register` | Registration form | No |
| `/documents` | List of user's documents | Yes |
| `/documents/new` | Create document form | Yes |
| `/documents/:id` | Document detail (view/edit) | Yes |
| `/report` | Summary report page | Yes |

### 12.2 Auth Flow

- `AuthContext` manages: `user`, `token`, `isAuthenticated`, `login()`, `register()`, `logout()`.
- On login/register success: store token in localStorage, set user state, redirect to `/documents`.
- On logout: clear localStorage, clear state, redirect to `/login`.
- `ProtectedRoute` component: if not authenticated, redirect to `/login`.
- Axios interceptor: on every request, attach `Authorization: Bearer <token>` header. On 401 response, clear auth state and redirect to `/login`.

### 12.3 Documents List Page

- Display a table or card list of documents.
- Columns: Title, Customer, Issue Date, Status, Grand Total (formatted as currency), Actions.
- Actions: "View" link (navigates to detail page).
- A "Create Document" button at the top.
- Optional: filter by status (draft/finalized/all).

### 12.4 Create Document Page

- Form with fields: Title, Customer, Issue Date (date picker).
- A "Line Items" section where the user can add line items inline:
  - Each line item row: Description, Quantity, Unit Price (in dollars, convert to cents on submit), Discount Type (none/percent/fixed), Discount Value, Tax Percent.
  - "Add Line Item" button to add another row.
  - "Remove" button per row.
- A "Save as Draft" button that submits the form.
- On success, redirect to the document detail page.

**Dollar-to-cents conversion:** The user types dollar amounts (e.g., "100.00"). The frontend converts to cents before sending to the API: `Math.round(parseFloat(value) * 100)`. For fixed discounts, same conversion. The API ONLY deals in integer cents.

### 12.5 Document Detail Page

- Display document metadata: title, customer, issue date, status.
- Display line items in a table:
  - Columns: Description, Qty, Unit Price, Discount, Tax %, Subtotal, Discount Amt, After Discount, Tax Amt, Line Total.
  - All monetary columns formatted as dollars (cents / 100, with 2 decimal places).
- Display document totals: Subtotal, Total Discount, Total Tax, Grand Total.
- If status is `'draft'`:
  - Show "Add Line Item" form/button.
  - Show "Edit" and "Remove" buttons per line item.
  - Show "Edit Document" button for metadata.
  - Show "Finalize" button with a confirmation dialog ("Are you sure? This action cannot be undone.").
- If status is `'finalized'`:
  - All edit controls are hidden.
  - Display a badge or banner indicating the document is finalized.
  - Optionally show a "Duplicate as Draft" button (stretch goal, not required).

### 12.6 Report Page

- Date range selector: Start Date and End Date inputs (date pickers).
- "Generate Report" button.
- Display results:
  - Number of documents in range.
  - Subtotal, Total Discount, Total Tax, Grand Total (formatted as currency).
- All values formatted as USD.

### 12.7 Formatting Utilities

File: `client/src/utils/format.ts`

```typescript
export function formatMoney(amount: number): string {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
```

Note: `formatMoney` is named generically (not `centsToDisplay` or `dollarsToDisplay`) so that adding multi-currency support later only requires adding a `currency` parameter, not renaming the function across the codebase. For now, USD is hardcoded.

### 12.8 Frontend Form Validation

Apply basic client-side validation (required fields, min values) using HTML attributes and/or controlled component logic. This is a convenience for the user; the real validation happens server-side. Do NOT duplicate Zod schemas on the frontend.

---

## 13. Swagger / OpenAPI Docs

### 13.1 Setup

File: `server/src/swagger.ts`

Use `swagger-jsdoc` to generate the OpenAPI spec from JSDoc comments in route files, and `swagger-ui-express` to serve the interactive docs.

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Multi-Rate Pricing Calculator API',
      version: '1.0.0',
      description: 'API for creating documents with line items, applying discounts and tax, and generating summary reports.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1 base path',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Define reusable schemas here: Document, LineItem, Error, etc.
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
```

### 13.2 Documentation Requirements

Every route file MUST include JSDoc/YAML comments that swagger-jsdoc can parse. Each endpoint must document:

1. Summary and description.
2. Request parameters (path params, query params).
3. Request body schema (with examples).
4. All possible response codes and their schemas.
5. Security requirement (bearerAuth) for authenticated endpoints.

### 13.3 Reusable Component Schemas to Define

Define these in the `components.schemas` section of the swagger config:

- `SuccessResponse` (status: 'success', message: string, data: object)
- `ErrorResponse` (status: 'error', message: string, error_code: string, details?: array)
- `User` (id, email, createdAt)
- `AuthResponseData` (user, token)
- `LineItem` (all fields including computed)
- `Document` (all fields including embedded lineItems and computed totals)
- `DocumentTotals` (subtotal, totalDiscount, totalTax, grandTotal)
- `ReportSummary` (documentCount, subtotal, totalDiscount, totalTax, grandTotal, startDate, endDate)
- `ValidationErrorDetail` (field: string, message: string)
- `Pagination` (page, limit, total, totalPages)

### 13.4 Access

Swagger UI must be accessible at `http://localhost:5000/api-docs` when the server is running. No authentication required to view the docs.

---

## 14. Testing Requirements

### 14.1 Test Framework

Use Jest with ts-jest. Configure in `server/jest.config.ts`.

### 14.2 Calculator Unit Tests (MANDATORY)

File: `server/tests/calculator.test.ts`

These tests are the highest-value deliverable. They test the pure calculation module with no database, no HTTP, no mocking.

**Required test cases:**

1. **Sample document verification:** The exact sample data from Section 7.6. Assert all line-level values and document totals.

2. **No discount, no tax:** A line item with quantity=3, unitPrice=1000, no discount, taxPercent=0. Assert subtotal=3000, all others 0, lineTotal=3000.

3. **Percent discount only, no tax:** quantity=1, unitPrice=10000, discount={type:'percent', value:25}, taxPercent=0. Assert subtotal=10000, discount=2500, afterDiscount=7500, tax=0, lineTotal=7500.

4. **Fixed discount only, no tax:** quantity=1, unitPrice=5000, discount={type:'fixed', value:1500}, taxPercent=0. Assert subtotal=5000, discount=1500, afterDiscount=3500, tax=0, lineTotal=3500.

5. **Fixed discount exceeds subtotal (clamping):** quantity=1, unitPrice=1000, discount={type:'fixed', value:5000}, taxPercent=0. Assert discount clamped to 1000, afterDiscount=0, lineTotal=0.

6. **Tax only, no discount:** quantity=2, unitPrice=10000, taxPercent=10. Assert subtotal=20000, discount=0, afterDiscount=20000, tax=2000, lineTotal=22000.

7. **Discount + tax combined:** quantity=4, unitPrice=2500, discount={type:'percent', value:20}, taxPercent=8. Assert subtotal=10000, discount=2000, afterDiscount=8000, tax=640, lineTotal=8640.

8. **Rounding: percent discount produces fractional cents:** quantity=1, unitPrice=3333, discount={type:'percent', value:15}, taxPercent=7. Manually compute: discount=Math.round(3333*15/100)=Math.round(499.95)=500. afterDiscount=2833. tax=Math.round(2833*7/100)=Math.round(198.31)=198. lineTotal=3031. Assert these exact values.

9. **Empty line items array:** `computeDocumentTotals([])` returns all zeros.

10. **Multiple line items summing:** Pass 3+ line items, verify document totals are exact sums of individual line results.

### 14.3 Integration Tests (RECOMMENDED)

File: `server/tests/document.routes.test.ts` and `server/tests/lineItem.routes.test.ts`

Use `mongodb-memory-server` for an in-memory MongoDB instance. Use `supertest` for HTTP assertions.

**Required integration test cases:**

1. **Finalize enforcement:** Create a document, add a line item, finalize it. Then attempt to: (a) update the document metadata, (b) add a line item, (c) update an existing line item, (d) delete a line item. All four must return 403 with code `DOCUMENT_FINALIZED`.

2. **Finalize with no line items:** Create a document with no line items. Attempt to finalize. Must return 400 with code `NO_LINE_ITEMS`.

3. **Ownership isolation:** Create a document as User A. Attempt to fetch it as User B. Must return 404.

4. **Over-payment-style validation:** Attempt to add a line item with quantity=0. Must return 400.

5. **Report only includes finalized:** Create 2 documents in the date range, finalize only 1. Report should show documentCount=1 and totals from only the finalized document.

---

## 15. Seed Data

Create a seed script at `server/src/seed.ts` that can be run with `npx ts-node src/seed.ts` or via an npm script `npm run seed`.

The script should:

1. Connect to the database.
2. Drop existing data (users, documents) if a `--force` flag is provided.
3. Create a test user: `email: test@example.com`, `password: password123`.
4. Create one document with the sample data:
   - Title: "Sample Invoice"
   - Customer: "Acme Corp"
   - Issue Date: "2026-01-15"
   - Status: "draft"
   - Line Items:
     - Widget A: qty=2, unitPrice=10000, discount={type:'percent', value:10}, taxPercent=5
     - Widget B: qty=1, unitPrice=5000, discount=null, taxPercent=5
     - Service fee: qty=1, unitPrice=20000, discount={type:'fixed', value:2000}, taxPercent=0
   - All computed fields must be calculated using the calculator module (not hardcoded).
5. Create a second document (finalized) for report testing:
   - Title: "Q1 Consulting"
   - Customer: "Beta Inc"
   - Issue Date: "2026-02-20"
   - Status: "finalized"
   - Line Items:
     - Consulting: qty=10, unitPrice=15000, discount={type:'percent', value:5}, taxPercent=10
   - Computed via calculator.
6. Print a summary of what was created and disconnect.

---

## 16. Non-Functional Requirements

### 16.1 Security

- **Never trust the client.** All computed monetary values are calculated server-side. If the client sends `subtotal`, `grandTotal`, or any computed field, the server ignores them.
- **Never expose password hashes.** Use Mongoose `toJSON` transforms to strip `passwordHash` from all user serializations.
- **Never distinguish "not found" from "not authorized."** If a user requests a document that exists but belongs to another user, return 404, not 403.
- **Sanitize inputs.** Zod handles type coercion and trimming. Do not allow HTML or script injection in string fields (Zod's `.trim()` plus Mongoose's built-in sanitization is sufficient; no additional XSS library needed for an API-only backend).
- **Rate limiting:** Not required for this project, but mention in the README as a production improvement.
- **CORS:** Configure to allow only the frontend origin in development. Use the `cors` package with explicit origin configuration, not `cors()` with no arguments (which allows all origins).

### 16.2 Performance

- Indexes are defined in Section 5. Ensure they are created on Mongoose model initialization.
- The report aggregation uses a MongoDB aggregation pipeline, not in-memory JavaScript aggregation.
- Pagination on the documents list endpoint prevents unbounded result sets.
- Mention in the README: at scale, consider separating line items into their own collection with a `documentId` index if documents frequently have 100+ line items. For this project's scope, embedding is correct.

### 16.3 Code Quality

- TypeScript strict mode (`strict: true` in tsconfig.json).
- No `any` types. Use `unknown` with type narrowing if the type is genuinely unknown.
- No unused variables (enable `noUnusedLocals` and `noUnusedParameters` in tsconfig).
- Consistent code formatting. Use Prettier with default settings (or minimal config). Include a `.prettierrc` file.
- No console.log in production code except in the error handler and the seed script. Use `console.error` for errors.

### 16.4 Comments Policy

- **Minimal in-code comments.** Code should be self-documenting through clear naming.
- Do NOT add comments that restate what the code does (e.g., `// Hash the password` above `bcrypt.hash(password, 12)`).
- DO add comments for non-obvious business logic decisions (e.g., `// Clamp fixed discount to subtotal to prevent negative line totals`).
- Do NOT add section separator comments (e.g., `// ===== ROUTES =====`).
- Do NOT add JSDoc comments on internal functions unless the function signature is genuinely unclear. JSDoc is required ONLY on swagger-annotated route handlers for the OpenAPI spec.
- File-level comments: none. The file path and name should be self-explanatory given the project structure.

---

## 17. Engineering Principles

These are guardrails for the implementor. Follow them without exception.

1. **Never trust the user.** Validate every input. Reject invalid data with specific, actionable error messages. Never assume the client sends correct computed values. Never assume the client sends the correct `status` on creation.

2. **Server is the source of truth.** All monetary calculations happen in `calculator.ts` on the server. The frontend displays values; it does not compute them. If the frontend shows a different total than the server returns, the server is correct and the frontend has a display bug.

3. **Fail loudly, fail early.** If environment variables are missing, crash on startup. If a database query fails, let it propagate to the error handler. Do not silently swallow errors with empty catch blocks.

4. **Separation of concerns.** The calculator module has zero dependencies on Express, Mongoose, or any I/O. Route handlers are thin: validate input, call services/calculator, return response. Business logic does not live in route handlers.

5. **Idempotent design where possible.** The finalize endpoint uses `findOneAndUpdate` with a status filter to prevent double-finalization. Document this pattern.

6. **Consistent API contract.** Every endpoint returns the same error shape. Every success response follows predictable patterns. The client should never have to handle multiple error formats.

7. **Principle of least privilege.** Every database query is scoped by `userId`. There is no admin endpoint. There is no way for User A to see User B's data, even with a valid JWT.

8. **Test the core, not the framework.** The calculator module gets exhaustive unit tests because it contains the highest-risk logic. Route-level tests verify the middleware chain and status codes. Do not test Express internals or Mongoose internals.

9. **No premature optimization.** Do not add caching, background jobs, message queues, or any infrastructure beyond Express + MongoDB. Mention these as production improvements in the README.

10. **No dead code.** Do not leave commented-out code, unused imports, or placeholder functions that are never called. Every line in the codebase should serve the requirements in this spec.

---

## 18. README Requirements

The README.md at the project root must contain the following sections. Write clearly and concisely. Use the exact section headers listed below.

### 18.1 Required Sections

1. **Overview:** One paragraph describing the application.

2. **Tech Stack:** List the backend and frontend technologies used.

3. **Prerequisites:** What the developer needs installed (Node.js, MongoDB, etc.) with minimum versions.

4. **Setup Instructions:** Step-by-step commands to clone, install, configure, seed, and run both server and client. Include:
   - `cp .env.example .env` and what to configure
   - `cd server && npm install`
   - `cd client && npm install`
   - `npm run seed` (optional, for sample data)
   - `npm run dev` for both server and client
   - URL where the app runs locally (e.g., `http://localhost:5173` for the frontend, `http://localhost:5000` for the API)
   - Swagger docs URL: `http://localhost:5000/api-docs`

5. **API Overview:** List all endpoints with HTTP method, path, and one-line description. Reference Swagger for full details.

6. **Calculation and Rounding Policy:**
   - All monetary values stored as integer cents.
   - Rounding: `Math.round()` applied per-line at each percentage step (discount amount, tax amount).
   - Document totals are exact sums of rounded line values.
   - Worked example using the sample document (Widget A, Widget B, Service fee) showing step-by-step computation with actual numbers.

7. **Document Lifecycle:**
   - Documents start as `draft`.
   - `draft` documents are fully editable: metadata, add/edit/remove line items.
   - The `/finalize` endpoint transitions `draft` to `finalized`.
   - `finalized` documents are fully immutable. The API rejects all mutation attempts with 403.
   - There is no reverse transition (finalized back to draft).
   - Race condition handling: `findOneAndUpdate` with status filter.

8. **Edge Cases and Decisions:**
   - Fixed discount exceeding subtotal: clamped to subtotal (line total is 0, not negative).
   - Percent vs fixed discount: mutually exclusive per line. Only one `type` is accepted.
   - Finalize with no line items: rejected with 400.
   - Tax applied after discount (on the discounted amount, not the original subtotal).
   - Report only includes finalized documents.
   - Zero quantity or negative prices: rejected by validation (quantity >= 1, unitPrice >= 0).

9. **Assumptions and Tradeoffs:**
   - All amounts are in USD. Monetary field names are intentionally currency-agnostic (`unitPrice`, `subtotal`, `grandTotal` rather than `unitPriceCents` or `unitPriceDollars`) so that adding multi-currency support later requires only a `currency` field on the document, not a schema rename.
   - No multi-user collaboration (each document belongs to one user).
   - No audit log (would add in production).
   - No rate limiting (would add in production).
   - Line items are embedded in the document (suitable for typical document sizes; would consider separate collection for 100+ line items per document at scale).
   - JWT with no refresh token (acceptable for a take-home; would add refresh tokens in production).
   - No email verification on registration.

10. **What I Would Improve Before Production:**
    - Refresh token rotation with httpOnly cookies.
    - Rate limiting on auth endpoints.
    - Audit log for document state changes.
    - Pagination on line items within a document (if very large documents are expected).
    - PDF/printable export of documents.
    - Duplicate finalized document into new draft (stretch goal).
    - CI/CD pipeline with automated tests.
    - Input sanitization library for defense-in-depth.
    - Monitoring and alerting (error rates, latency).
    - Database backups and disaster recovery.

11. **Running Tests:**
    - `cd server && npm test`
    - Describe what the tests cover.

12. **Deployed URL:** Placeholder for the live deployment link.

---

## Appendix A: Full Endpoint Summary

| Method | Path | Auth | Middleware Chain | Description |
|---|---|---|---|---|
| POST | /api/v1/auth/register | No | validate | Register a new user |
| POST | /api/v1/auth/login | No | validate | Log in and receive JWT |
| GET | /api/v1/documents | Yes | authenticate | List user's documents |
| POST | /api/v1/documents | Yes | authenticate, validate | Create a new draft document |
| GET | /api/v1/documents/:id | Yes | authenticate, loadDocument | Get document detail |
| PUT | /api/v1/documents/:id | Yes | authenticate, loadDocument, requireDraft, validate | Update document metadata |
| DELETE | /api/v1/documents/:id | Yes | authenticate, loadDocument, requireDraft | Delete a draft document |
| POST | /api/v1/documents/:id/finalize | Yes | authenticate, loadDocument, requireDraft | Finalize a document |
| POST | /api/v1/documents/:id/line-items | Yes | authenticate, loadDocument, requireDraft, validate | Add a line item |
| PUT | /api/v1/documents/:id/line-items/:lineItemId | Yes | authenticate, loadDocument, requireDraft, validate | Update a line item |
| DELETE | /api/v1/documents/:id/line-items/:lineItemId | Yes | authenticate, loadDocument, requireDraft | Remove a line item |
| GET | /api/v1/reports/summary | Yes | authenticate, validate(query) | Get summary report for date range |

## Appendix B: Startup Sequence

The Express app must be configured in this order:

1. Load and validate environment variables (crash if invalid).
2. Connect to MongoDB (crash if connection fails).
3. Register middleware: `express.json()`, `cors(corsOptions)`.
4. Register versioned routes under `/api/v1`: auth, documents, line items, reports.
5. Register Swagger UI at `/api-docs`.
6. Register the global error handler (MUST be last).
7. Start listening on `PORT`.

Route registration in `app.ts` should look like:
```typescript
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/documents', lineItemRoutes);
app.use('/api/v1/reports', reportRoutes);
```

## Appendix C: Things NOT to Build

These are explicitly out of scope. Do not implement them:

- User profile or settings
- Email verification or password reset
- Role-based access control or admin panel
- Multi-currency support (all amounts are USD; field names are intentionally currency-agnostic for future expansion)
- Order-level (document-level) tax or discount (only per-line)
- Draft auto-save or version history
- Real-time collaboration or WebSocket support
- File upload (beyond the scope; no attachments on documents)
- Notification system
- Dark mode or theme switching
- Internationalization (i18n)
- Docker or containerization
- CI/CD pipeline configuration files
- Deployment configuration (Vercel, AWS, etc.)
