import { z } from 'zod';
import { lineItemInputSchema } from './lineItem.validators';

// The regex alone would accept 2026-02-30. Round-tripping through Date rejects any
// day that does not exist in that month.
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    );
  }, 'Not a real calendar date.')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const documentFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  customer: z.string().trim().min(1).max(200),
  issueDate: isoDateSchema,
});

// Unknown keys are stripped by default, which is how client-supplied computed totals and
// `status` are silently ignored rather than rejected (spec §8.2).
export const createDocumentSchema = documentFieldsSchema.extend({
  lineItems: z.array(lineItemInputSchema).optional().default([]),
});

export const updateDocumentSchema = documentFieldsSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided.',
  });

export const listDocumentsSchema = z.object({
  status: z.enum(['draft', 'finalized']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateDocumentBody = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentBody = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsSchema>;
