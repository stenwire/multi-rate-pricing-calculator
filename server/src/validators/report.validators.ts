import { z } from 'zod';

const isoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    );
  }, 'Not a real calendar date.');

// Kept as strings: the report echoes the requested range back verbatim (spec §8.4), and the
// route widens them to a start-of-day / end-of-day instant for the query.
export const reportSummarySchema = z
  .object({
    startDate: isoDateStringSchema,
    endDate: isoDateStringSchema,
  })
  .refine((query) => query.endDate >= query.startDate, {
    message: 'endDate must be on or after startDate.',
    path: ['endDate'],
  });

export type ReportSummaryQuery = z.infer<typeof reportSummarySchema>;
