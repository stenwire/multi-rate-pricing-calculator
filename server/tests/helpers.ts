import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';

export const API = '/api/v1';

let mongo: MongoMemoryServer | undefined;

export async function connectTestDatabase(): Promise<void> {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  await mongo?.stop();
}

export async function clearCollections(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

export interface TestUser {
  id: string;
  token: string;
  auth: Record<string, string>;
}

// Registers through the real endpoint rather than inserting directly, so every suite
// exercises the hashing and token-signing path it depends on.
export async function registerUser(
  email: string,
  password = 'password123',
): Promise<TestUser> {
  const response = await request(app)
    .post(`${API}/auth/register`)
    .send({ email, password });

  if (response.status !== 201) {
    throw new Error(
      `registerUser failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  const { user, token } = response.body.data;
  return { id: user.id, token, auth: { Authorization: `Bearer ${token}` } };
}

export interface LineItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: { type: 'percent' | 'fixed'; value: number } | null;
  taxPercent?: number;
}

// The three line items from spec §7.6, whose totals are 45000 / 4000 / 1150 / 42150.
export const SAMPLE_LINE_ITEMS: LineItemPayload[] = [
  {
    description: 'Widget A',
    quantity: 2,
    unitPrice: 10000,
    discount: { type: 'percent', value: 10 },
    taxPercent: 5,
  },
  {
    description: 'Widget B',
    quantity: 1,
    unitPrice: 5000,
    discount: null,
    taxPercent: 5,
  },
  {
    description: 'Service fee',
    quantity: 1,
    unitPrice: 20000,
    discount: { type: 'fixed', value: 2000 },
    taxPercent: 0,
  },
];

// Typed against the wire shape rather than the Mongoose model, so a change to the toJSON
// transform shows up as a test failure instead of passing silently.
export interface LineItemResponse {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: { type: 'percent' | 'fixed'; value: number } | null;
  taxPercent: number;
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface DocumentResponse {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: 'draft' | 'finalized';
  lineItems: LineItemResponse[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export async function createDocument(
  user: TestUser,
  overrides: Record<string, unknown> = {},
): Promise<DocumentResponse> {
  const response = await request(app)
    .post(`${API}/documents`)
    .set(user.auth)
    .send({
      title: 'Sample Invoice',
      customer: 'Acme Corp',
      issueDate: '2026-01-15',
      lineItems: SAMPLE_LINE_ITEMS,
      ...overrides,
    });

  if (response.status !== 201) {
    throw new Error(
      `createDocument failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.data;
}

export async function finalizeDocument(
  user: TestUser,
  documentId: string,
): Promise<void> {
  const response = await request(app)
    .post(`${API}/documents/${documentId}/finalize`)
    .set(user.auth);

  if (response.status !== 200) {
    throw new Error(
      `finalizeDocument failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }
}
