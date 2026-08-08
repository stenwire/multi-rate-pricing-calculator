import { z } from 'zod';

// Refinements live on the discount object rather than the line item, so the line item stays
// a plain ZodObject. A top-level .refine() would make it a ZodEffects, which has no
// .partial() — the method spec §9 calls for when deriving the update schema.
const discountSchema = z
  .object({
    type: z.enum(['percent', 'fixed']),
    value: z.number().min(0),
  })
  .refine((discount) => discount.type !== 'percent' || discount.value <= 100, {
    message: 'A percent discount cannot exceed 100.',
    path: ['value'],
  })
  .refine(
    (discount) => discount.type !== 'fixed' || Number.isInteger(discount.value),
    {
      message: 'A fixed discount must be an integer number of cents.',
      path: ['value'],
    },
  );

const lineItemFieldsSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
  discount: discountSchema.nullable(),
  taxPercent: z.number().min(0).max(100),
});

export const lineItemInputSchema = lineItemFieldsSchema.extend({
  discount: discountSchema.nullable().optional().default(null),
  taxPercent: z.number().min(0).max(100).optional().default(0),
});

export const createLineItemSchema = lineItemInputSchema;

export const updateLineItemSchema = lineItemFieldsSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

export type LineItemInputBody = z.infer<typeof lineItemInputSchema>;
export type UpdateLineItemBody = z.infer<typeof updateLineItemSchema>;
