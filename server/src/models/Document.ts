import { HydratedDocument, Schema, Types, model } from 'mongoose';
import { toJSONTransform } from '../utils/toJSON';

export type DiscountType = 'percent' | 'fixed';
export type DocumentStatus = 'draft' | 'finalized';

export interface DiscountAttributes {
  type: DiscountType;
  value: number;
}

export interface LineItemAttributes {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: DiscountAttributes | null;
  taxPercent: number;
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface DocumentAttributes {
  userId: Types.ObjectId;
  title: string;
  customer: string;
  issueDate: Date;
  status: DocumentStatus;
  lineItems: Types.DocumentArray<LineItemAttributes>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IDocument = HydratedDocument<DocumentAttributes>;

const discountSchema = new Schema<DiscountAttributes>(
  {
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true },
  },
  { _id: false },
);

const lineItemSchema = new Schema<LineItemAttributes>(
  {
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: discountSchema, default: null },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    afterDiscount: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  {
    toJSON: {
      transform: (_doc, ret) => toJSONTransform(ret),
    },
  },
);

const documentSchema = new Schema<DocumentAttributes>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    customer: { type: String, required: true, trim: true, maxlength: 200 },
    issueDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    lineItems: { type: [lineItemSchema], default: [] },
    subtotal: { type: Number, required: true, default: 0 },
    totalDiscount: { type: Number, required: true, default: 0 },
    totalTax: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => toJSONTransform(ret),
    },
  },
);

documentSchema.index({ userId: 1, issueDate: 1 });
documentSchema.index({ userId: 1, status: 1 });

export const DocumentModel = model<DocumentAttributes>(
  'Document',
  documentSchema,
);
