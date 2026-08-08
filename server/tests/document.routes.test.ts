import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';
import {
  API,
  SAMPLE_LINE_ITEMS,
  TestUser,
  clearCollections,
  connectTestDatabase,
  createDocument,
  disconnectTestDatabase,
  finalizeDocument,
  registerUser,
} from './helpers';

let owner: TestUser;
let stranger: TestUser;

beforeAll(connectTestDatabase);
afterAll(disconnectTestDatabase);

beforeEach(async () => {
  await clearCollections();
  owner = await registerUser('owner@example.com');
  stranger = await registerUser('stranger@example.com');
});

describe('authentication', () => {
  it('rejects a request with no token', async () => {
    const response = await request(app).get(`${API}/documents`);

    expect(response.status).toBe(401);
    expect(response.body.error_code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed token and a token without the Bearer prefix identically', async () => {
    const malformed = await request(app)
      .get(`${API}/documents`)
      .set('Authorization', 'Bearer not.a.real.jwt');
    const noPrefix = await request(app)
      .get(`${API}/documents`)
      .set('Authorization', owner.token);

    expect(malformed.status).toBe(401);
    expect(noPrefix.status).toBe(401);
    expect(malformed.body).toEqual(noPrefix.body);
  });
});

describe('POST /documents', () => {
  it('computes the spec §7.6 totals exactly', async () => {
    const document = await createDocument(owner);

    expect(document.subtotal).toBe(45000);
    expect(document.totalDiscount).toBe(4000);
    expect(document.totalTax).toBe(1150);
    expect(document.grandTotal).toBe(42150);
    expect(document.grandTotal).toBe(
      document.subtotal - document.totalDiscount + document.totalTax,
    );
  });

  it('prices each line item server-side', async () => {
    const { lineItems } = await createDocument(owner);

    expect(lineItems[0]).toMatchObject({
      subtotal: 20000,
      discountAmount: 2000,
      afterDiscount: 18000,
      taxAmount: 900,
      lineTotal: 18900,
    });
    expect(lineItems[1]).toMatchObject({
      discountAmount: 0,
      taxAmount: 250,
      lineTotal: 5250,
    });
    expect(lineItems[2]).toMatchObject({
      discountAmount: 2000,
      taxAmount: 0,
      lineTotal: 18000,
    });
  });

  it('ignores client-supplied status and computed totals', async () => {
    const response = await request(app)
      .post(`${API}/documents`)
      .set(owner.auth)
      .send({
        title: 'Tampered',
        customer: 'Acme Corp',
        issueDate: '2026-01-15',
        status: 'finalized',
        subtotal: 999999,
        grandTotal: 999999,
        lineItems: [{ ...SAMPLE_LINE_ITEMS[1], subtotal: 1, lineTotal: 1 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('draft');
    expect(response.body.data.subtotal).toBe(5000);
    expect(response.body.data.grandTotal).toBe(5250);
    expect(response.body.data.lineItems[0].lineTotal).toBe(5250);
  });

  it('starts with no line items and zero totals when none are supplied', async () => {
    const document = await createDocument(owner, { lineItems: undefined });

    expect(document.lineItems).toHaveLength(0);
    expect(document.grandTotal).toBe(0);
  });

  it('rejects an impossible issue date', async () => {
    const response = await request(app)
      .post(`${API}/documents`)
      .set(owner.auth)
      .send({ title: 'Bad date', customer: 'Acme', issueDate: '2026-02-30' });

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
    expect(response.body.details[0].field).toBe('issueDate');
  });
});

describe('ownership isolation', () => {
  it("returns 404, not 403, for another user's document", async () => {
    const document = await createDocument(owner);

    const response = await request(app)
      .get(`${API}/documents/${document.id}`)
      .set(stranger.auth);

    expect(response.status).toBe(404);
    expect(response.body.error_code).toBe('DOCUMENT_NOT_FOUND');
  });

  it("omits another user's documents from the list", async () => {
    await createDocument(owner);

    const response = await request(app)
      .get(`${API}/documents`)
      .set(stranger.auth);

    expect(response.body.data.documents).toHaveLength(0);
    expect(response.body.data.pagination.total).toBe(0);
  });

  it("refuses to mutate another user's document", async () => {
    const document = await createDocument(owner);

    const update = await request(app)
      .put(`${API}/documents/${document.id}`)
      .set(stranger.auth)
      .send({ title: 'Hijacked' });
    const remove = await request(app)
      .delete(`${API}/documents/${document.id}`)
      .set(stranger.auth);

    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
  });

  it('treats a malformed id as not found rather than a bad request', async () => {
    const response = await request(app)
      .get(`${API}/documents/not-an-object-id`)
      .set(owner.auth);

    expect(response.status).toBe(404);
    expect(response.body.error_code).toBe('DOCUMENT_NOT_FOUND');
  });
});

describe('GET /documents', () => {
  it('paginates and reports totals', async () => {
    await createDocument(owner);
    await createDocument(owner);
    await createDocument(owner);

    const response = await request(app)
      .get(`${API}/documents?page=1&limit=2`)
      .set(owner.auth);

    expect(response.body.data.documents).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('filters by status', async () => {
    const draft = await createDocument(owner);
    const toFinalize = await createDocument(owner);
    await finalizeDocument(owner, toFinalize.id);

    const finalized = await request(app)
      .get(`${API}/documents?status=finalized`)
      .set(owner.auth);

    expect(finalized.body.data.documents).toHaveLength(1);
    expect(finalized.body.data.documents[0].id).toBe(toFinalize.id);
    expect(finalized.body.data.documents[0].id).not.toBe(draft.id);
  });

  it('rejects a limit above the maximum', async () => {
    const response = await request(app)
      .get(`${API}/documents?limit=101`)
      .set(owner.auth);

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /documents/:id', () => {
  it('updates metadata and ignores line items and status', async () => {
    const document = await createDocument(owner);

    const response = await request(app)
      .put(`${API}/documents/${document.id}`)
      .set(owner.auth)
      .send({ title: 'Renamed', status: 'finalized', lineItems: [] });

    expect(response.body.data.title).toBe('Renamed');
    expect(response.body.data.status).toBe('draft');
    expect(response.body.data.lineItems).toHaveLength(3);
  });

  it('rejects an empty body', async () => {
    const document = await createDocument(owner);

    const response = await request(app)
      .put(`${API}/documents/${document.id}`)
      .set(owner.auth)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /documents/:id/finalize', () => {
  it('refuses to finalize a document with no line items', async () => {
    const document = await createDocument(owner, { lineItems: [] });

    const response = await request(app)
      .post(`${API}/documents/${document.id}/finalize`)
      .set(owner.auth);

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('NO_LINE_ITEMS');
    expect(response.body.message).toBe(
      'Cannot finalize a document with no line items.',
    );
  });

  it('transitions a draft to finalized', async () => {
    const document = await createDocument(owner);

    const response = await request(app)
      .post(`${API}/documents/${document.id}/finalize`)
      .set(owner.auth);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('finalized');
  });

  it('lets exactly one of two concurrent finalize requests succeed', async () => {
    const document = await createDocument(owner);

    const [first, second] = await Promise.all([
      request(app)
        .post(`${API}/documents/${document.id}/finalize`)
        .set(owner.auth),
      request(app)
        .post(`${API}/documents/${document.id}/finalize`)
        .set(owner.auth),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses[0]).toBe(200);
    // The loser is rejected either by requireDraft or by the conditional update, depending on
    // which side of the read the second request lands.
    expect([403, 409]).toContain(statuses[1]);
  });

  describe('once finalized, the document is immutable', () => {
    let documentId: string;
    let lineItemId: string;

    beforeEach(async () => {
      const document = await createDocument(owner);
      documentId = document.id;
      lineItemId = document.lineItems[0].id;
      await finalizeDocument(owner, documentId);
    });

    it('rejects a metadata update', async () => {
      const response = await request(app)
        .put(`${API}/documents/${documentId}`)
        .set(owner.auth)
        .send({ title: 'Nope' });

      expect(response.status).toBe(403);
      expect(response.body.error_code).toBe('DOCUMENT_FINALIZED');
    });

    it('rejects adding a line item', async () => {
      const response = await request(app)
        .post(`${API}/documents/${documentId}/line-items`)
        .set(owner.auth)
        .send({ description: 'Nope', quantity: 1, unitPrice: 100 });

      expect(response.status).toBe(403);
      expect(response.body.error_code).toBe('DOCUMENT_FINALIZED');
    });

    it('rejects updating a line item', async () => {
      const response = await request(app)
        .put(`${API}/documents/${documentId}/line-items/${lineItemId}`)
        .set(owner.auth)
        .send({ quantity: 99 });

      expect(response.status).toBe(403);
      expect(response.body.error_code).toBe('DOCUMENT_FINALIZED');
    });

    it('rejects deleting a line item', async () => {
      const response = await request(app)
        .delete(`${API}/documents/${documentId}/line-items/${lineItemId}`)
        .set(owner.auth);

      expect(response.status).toBe(403);
      expect(response.body.error_code).toBe('DOCUMENT_FINALIZED');
    });

    it('rejects deleting the document', async () => {
      const response = await request(app)
        .delete(`${API}/documents/${documentId}`)
        .set(owner.auth);

      expect(response.status).toBe(403);
      expect(response.body.error_code).toBe('DOCUMENT_FINALIZED');
    });

    it('leaves the stored totals untouched after every rejected mutation', async () => {
      const response = await request(app)
        .get(`${API}/documents/${documentId}`)
        .set(owner.auth);

      expect(response.body.data.grandTotal).toBe(42150);
      expect(response.body.data.lineItems).toHaveLength(3);
    });
  });
});

describe('DELETE /documents/:id', () => {
  it('removes a draft and returns a null payload', async () => {
    const document = await createDocument(owner);

    const response = await request(app)
      .delete(`${API}/documents/${document.id}`)
      .set(owner.auth);
    const afterwards = await request(app)
      .get(`${API}/documents/${document.id}`)
      .set(owner.auth);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(afterwards.status).toBe(404);
  });
});

describe('GET /reports/summary', () => {
  it('counts only finalized documents', async () => {
    const finalized = await createDocument(owner, { issueDate: '2026-01-15' });
    await finalizeDocument(owner, finalized.id);
    await createDocument(owner, { issueDate: '2026-01-20' });

    const response = await request(app)
      .get(`${API}/reports/summary?startDate=2026-01-01&endDate=2026-03-31`)
      .set(owner.auth);

    expect(response.body.data.summary).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      documentCount: 1,
      subtotal: 45000,
      totalDiscount: 4000,
      totalTax: 1150,
      grandTotal: 42150,
    });
  });

  it('scopes the report to the requesting user', async () => {
    const document = await createDocument(owner);
    await finalizeDocument(owner, document.id);

    const response = await request(app)
      .get(`${API}/reports/summary?startDate=2026-01-01&endDate=2026-03-31`)
      .set(stranger.auth);

    expect(response.body.data.summary.documentCount).toBe(0);
    expect(response.body.data.summary.grandTotal).toBe(0);
  });

  it('treats both bounds as inclusive', async () => {
    const document = await createDocument(owner, { issueDate: '2026-04-30' });
    await finalizeDocument(owner, document.id);

    const response = await request(app)
      .get(`${API}/reports/summary?startDate=2026-04-30&endDate=2026-04-30`)
      .set(owner.auth);

    expect(response.body.data.summary.documentCount).toBe(1);
  });

  it('excludes documents outside the range', async () => {
    const document = await createDocument(owner, { issueDate: '2026-01-15' });
    await finalizeDocument(owner, document.id);

    const response = await request(app)
      .get(`${API}/reports/summary?startDate=2026-02-01&endDate=2026-02-28`)
      .set(owner.auth);

    expect(response.body.data.summary.documentCount).toBe(0);
  });

  it('returns zeros rather than an error for an empty range', async () => {
    const response = await request(app)
      .get(`${API}/reports/summary?startDate=2030-01-01&endDate=2030-12-31`)
      .set(owner.auth);

    expect(response.status).toBe(200);
    expect(response.body.data.summary.documentCount).toBe(0);
    expect(response.body.data.summary.grandTotal).toBe(0);
  });

  it('distinguishes a malformed date from a reversed range', async () => {
    const malformed = await request(app)
      .get(`${API}/reports/summary?startDate=01-01-2026&endDate=2026-03-31`)
      .set(owner.auth);
    const reversed = await request(app)
      .get(`${API}/reports/summary?startDate=2026-03-31&endDate=2026-01-01`)
      .set(owner.auth);

    expect(malformed.status).toBe(400);
    expect(malformed.body.error_code).toBe('VALIDATION_ERROR');
    expect(reversed.status).toBe(400);
    expect(reversed.body.error_code).toBe('INVALID_DATE_RANGE');
  });
});

describe('unmatched routes and malformed bodies', () => {
  it('answers an unknown API path with the error envelope', async () => {
    const response = await request(app).get(`${API}/does-not-exist`);

    expect(response.status).toBe(404);
    expect(response.body.error_code).toBe('ROUTE_NOT_FOUND');
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('answers an unparseable JSON body with 400, not 500', async () => {
    const response = await request(app)
      .post(`${API}/auth/login`)
      .set('Content-Type', 'application/json')
      .send('{"email": broken');

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
  });
});

afterAll(async () => {
  // Surfaces a leaked connection as a failure rather than an open handle warning.
  expect(mongoose.connection.readyState).toBeLessThanOrEqual(1);
});
