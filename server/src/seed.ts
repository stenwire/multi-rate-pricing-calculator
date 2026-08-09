import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from './config/db';
import { DocumentModel, DocumentStatus } from './models/Document';
import { BCRYPT_SALT_ROUNDS } from './routes/auth.routes';
import { User } from './models/User';
import { recalculateDocument } from './services/documentTotals';

const SEED_USER = { email: 'test@example.com', password: 'password123' };

interface SeedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: { type: 'percent' | 'fixed'; value: number } | null;
  taxPercent: number;
}

interface SeedDocument {
  title: string;
  customer: string;
  issueDate: string;
  status: DocumentStatus;
  lineItems: SeedLineItem[];
}

const SEED_DOCUMENTS: SeedDocument[] = [
  {
    title: 'Sample Invoice',
    customer: 'Acme Corp',
    issueDate: '2026-01-15',
    status: 'draft',
    lineItems: [
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
    ],
  },
  {
    title: 'Q1 Consulting',
    customer: 'Beta Inc',
    issueDate: '2026-02-20',
    status: 'finalized',
    lineItems: [
      {
        description: 'Consulting',
        quantity: 10,
        unitPrice: 15000,
        discount: { type: 'percent', value: 5 },
        taxPercent: 10,
      },
    ],
  },
];

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function seed(): Promise<void> {
  const force = process.argv.includes('--force');

  await connectDatabase();
  console.log(`Connected to ${mongoose.connection.name}.`);

  if (force) {
    const [users, documents] = await Promise.all([
      User.deleteMany({}),
      DocumentModel.deleteMany({}),
    ]);
    console.log(
      `--force: removed ${users.deletedCount} user(s) and ${documents.deletedCount} document(s).`,
    );
  } else if (await User.exists({ email: SEED_USER.email })) {
    // Without this the unique index would surface as an opaque E11000 part-way through.
    console.error(
      `A user with ${SEED_USER.email} already exists. Re-run with "npm run seed -- --force" to wipe and reseed.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(
    SEED_USER.password,
    BCRYPT_SALT_ROUNDS,
  );
  const user = await User.create({ email: SEED_USER.email, passwordHash });
  console.log(`Created user ${user.email} (password: ${SEED_USER.password})`);

  for (const seedDocument of SEED_DOCUMENTS) {
    const document = new DocumentModel({
      userId: user._id,
      title: seedDocument.title,
      customer: seedDocument.customer,
      issueDate: new Date(`${seedDocument.issueDate}T00:00:00.000Z`),
      status: seedDocument.status,
      lineItems: seedDocument.lineItems,
    });

    // Same path the API uses, so no total here is ever hand-written.
    recalculateDocument(document);
    await document.save();

    console.log(
      `\nCreated "${document.title}" for ${document.customer} [${document.status}] on ${seedDocument.issueDate}`,
    );
    for (const line of document.lineItems) {
      console.log(
        `  ${line.description.padEnd(14)} ${String(line.quantity).padStart(3)} x ${formatMoney(line.unitPrice).padStart(10)}  ->  ${formatMoney(line.lineTotal).padStart(10)}`,
      );
    }
    console.log(
      `  subtotal ${formatMoney(document.subtotal)} | discount ${formatMoney(document.totalDiscount)} | tax ${formatMoney(document.totalTax)} | grand total ${formatMoney(document.grandTotal)}`,
    );
  }

  await mongoose.disconnect();
  console.log('\nSeed complete.');
}

seed().catch(async (error: unknown) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
