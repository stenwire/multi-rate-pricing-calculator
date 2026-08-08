import { Types } from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';
import {
  API,
  DocumentResponse,
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
let document: DocumentResponse;

beforeAll(connectTestDatabase);
afterAll(disconnectTestDatabase);

beforeEach(async () => {
  await clearCollections();
  owner = await registerUser('owner@example.com');
  stranger = await registerUser('stranger@example.com');
  document = await createDocument(owner);
});

describe('POST /documents/:id/line-items', () => {
  it('adds a line item and recomputes the document totals', async () => {
    const response = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({
        description: 'Extra',
        quantity: 1,
        unitPrice: 1000,
        taxPercent: 10,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.lineItems).toHaveLength(4);
    expect(response.body.data.lineItems[3]).toMatchObject({
      subtotal: 1000,
      discountAmount: 0,
      afterDiscount: 1000,
      taxAmount: 100,
      lineTotal: 1100,
    });
    expect(response.body.data.subtotal).toBe(46000);
    expect(response.body.data.grandTotal).toBe(43250);
  });

  it('ignores computed fields sent by the client', async () => {
    const response = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({
        description: 'Tampered',
        quantity: 2,
        unitPrice: 500,
        subtotal: 999999,
        lineTotal: 999999,
      });

    expect(response.body.data.lineItems[3].subtotal).toBe(1000);
    expect(response.body.data.lineItems[3].lineTotal).toBe(1000);
  });

  it('clamps a fixed discount larger than the line subtotal', async () => {
    const response = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({
        description: 'Over-discounted',
        quantity: 1,
        unitPrice: 1000,
        discount: { type: 'fixed', value: 5000 },
      });

    expect(response.body.data.lineItems[3]).toMatchObject({
      discountAmount: 1000,
      afterDiscount: 0,
      lineTotal: 0,
    });
  });

  it('rejects a quantity of zero', async () => {
    const response = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({ description: 'Zero', quantity: 0, unitPrice: 100 });

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
    expect(response.body.details[0].field).toBe('quantity');
  });

  it('rejects a negative unit price', async () => {
    const response = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({ description: 'Negative', quantity: 1, unitPrice: -1 });

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('rejects a percent discount above 100 and a non-integer fixed discount', async () => {
    const percent = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({
        description: 'Too much',
        quantity: 1,
        unitPrice: 100,
        discount: { type: 'percent', value: 101 },
      });
    const fixed = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({
        description: 'Fractional cents',
        quantity: 1,
        unitPrice: 100,
        discount: { type: 'fixed', value: 10.5 },
      });

    expect(percent.status).toBe(400);
    expect(fixed.status).toBe(400);
  });

  it("refuses to add to another user's document", async () => {
    const response = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(stranger.auth)
      .send({ description: 'Intruder', quantity: 1, unitPrice: 100 });

    expect(response.status).toBe(404);
    expect(response.body.error_code).toBe('DOCUMENT_NOT_FOUND');
  });
});

describe('PUT /documents/:id/line-items/:lineItemId', () => {
  it('applies a partial update and recomputes', async () => {
    const target = document.lineItems[0].id;

    const response = await request(app)
      .put(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth)
      .send({ quantity: 4 });

    const updated = response.body.data.lineItems[0];
    expect(updated.quantity).toBe(4);
    expect(updated.description).toBe('Widget A');
    expect(updated).toMatchObject({
      subtotal: 40000,
      discountAmount: 4000,
      afterDiscount: 36000,
      taxAmount: 1800,
      lineTotal: 37800,
    });
    expect(response.body.data.subtotal).toBe(65000);
  });

  it('can clear a discount by sending null', async () => {
    const target = document.lineItems[0].id;

    const response = await request(app)
      .put(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth)
      .send({ discount: null });

    expect(response.body.data.lineItems[0].discount).toBeNull();
    expect(response.body.data.lineItems[0].discountAmount).toBe(0);
    expect(response.body.data.lineItems[0].lineTotal).toBe(21000);
  });

  it('keeps line item ids stable across updates', async () => {
    const target = document.lineItems[1].id;

    const response = await request(app)
      .put(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth)
      .send({ description: 'Renamed' });

    expect(
      response.body.data.lineItems.map((line: { id: string }) => line.id),
    ).toEqual(document.lineItems.map((line) => line.id));
  });

  it('rejects an empty update body', async () => {
    const target = document.lineItems[0].id;

    const response = await request(app)
      .put(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('still enforces field rules on a partial update', async () => {
    const target = document.lineItems[0].id;

    const response = await request(app)
      .put(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth)
      .send({ discount: { type: 'percent', value: 500 } });

    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns LINE_ITEM_NOT_FOUND for an unknown line item', async () => {
    const response = await request(app)
      .put(
        `${API}/documents/${document.id}/line-items/${new Types.ObjectId().toString()}`,
      )
      .set(owner.auth)
      .send({ quantity: 2 });

    expect(response.status).toBe(404);
    expect(response.body.error_code).toBe('LINE_ITEM_NOT_FOUND');
  });

  it('treats a malformed line item id as not found', async () => {
    const response = await request(app)
      .put(`${API}/documents/${document.id}/line-items/nonsense`)
      .set(owner.auth)
      .send({ quantity: 2 });

    expect(response.status).toBe(404);
    expect(response.body.error_code).toBe('LINE_ITEM_NOT_FOUND');
  });
});

describe('DELETE /documents/:id/line-items/:lineItemId', () => {
  it('removes the line item and recomputes the totals', async () => {
    const target = document.lineItems[0].id;

    const response = await request(app)
      .delete(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth);

    expect(response.status).toBe(200);
    expect(response.body.data.lineItems).toHaveLength(2);
    expect(response.body.data.subtotal).toBe(25000);
    expect(response.body.data.grandTotal).toBe(23250);
  });

  it('leaves totals at zero once the last line item is removed', async () => {
    for (const line of document.lineItems) {
      await request(app)
        .delete(`${API}/documents/${document.id}/line-items/${line.id}`)
        .set(owner.auth);
    }

    const response = await request(app)
      .get(`${API}/documents/${document.id}`)
      .set(owner.auth);

    expect(response.body.data.lineItems).toHaveLength(0);
    expect(response.body.data).toMatchObject({
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 0,
    });
  });

  it('returns LINE_ITEM_NOT_FOUND for an unknown line item', async () => {
    const response = await request(app)
      .delete(
        `${API}/documents/${document.id}/line-items/${new Types.ObjectId().toString()}`,
      )
      .set(owner.auth);

    expect(response.status).toBe(404);
    expect(response.body.error_code).toBe('LINE_ITEM_NOT_FOUND');
  });
});

describe('line item mutations on a finalized document', () => {
  beforeEach(async () => {
    await finalizeDocument(owner, document.id);
  });

  it('rejects add, update and delete alike', async () => {
    const target = document.lineItems[0].id;

    const add = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({ description: 'Nope', quantity: 1, unitPrice: 100 });
    const update = await request(app)
      .put(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth)
      .send({ quantity: 5 });
    const remove = await request(app)
      .delete(`${API}/documents/${document.id}/line-items/${target}`)
      .set(owner.auth);

    for (const response of [add, update, remove]) {
      expect(response.status).toBe(403);
      expect(response.body.error_code).toBe('DOCUMENT_FINALIZED');
    }
  });

  it('rejects the mutation before validating the body, so a bad payload still returns 403', async () => {
    const response = await request(app)
      .post(`${API}/documents/${document.id}/line-items`)
      .set(owner.auth)
      .send({ quantity: 0 });

    expect(response.status).toBe(403);
    expect(response.body.error_code).toBe('DOCUMENT_FINALIZED');
  });
});
