import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { DocumentModel } from '../models/Document';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import {
  ReportSummaryQuery,
  reportSummarySchema,
} from '../validators/report.validators';

const router = Router();

router.use(authenticate);

interface SummaryAggregate {
  documentCount: number;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

const EMPTY_SUMMARY: SummaryAggregate = {
  documentCount: 0,
  subtotal: 0,
  totalDiscount: 0,
  totalTax: 0,
  grandTotal: 0,
};

/**
 * @openapi
 * /reports/summary:
 *   get:
 *     tags: [Reports]
 *     summary: Totals across finalized documents in a date range
 *     description: >
 *       Both bounds are inclusive. Only finalized documents belonging to the authenticated
 *       user are counted; drafts are excluded. An empty range returns zeros rather than 404.
 *       A malformed date fails validation with VALIDATION_ERROR; a well-formed but reversed
 *       range fails with INVALID_DATE_RANGE.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date, example: '2026-01-01' }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date, example: '2026-03-31' }
 *     responses:
 *       200:
 *         description: Report generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         summary: { $ref: '#/components/schemas/ReportSummary' }
 *       400: { description: 'VALIDATION_ERROR for a missing or malformed date; INVALID_DATE_RANGE when endDate precedes startDate.', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  '/summary',
  validate(reportSummarySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query as unknown as ReportSummaryQuery;

    // Raised here rather than as a Zod refinement so the §10.4 code is the one the client
    // sees; anything the validate middleware rejects would carry VALIDATION_ERROR instead.
    if (endDate < startDate) {
      throw new AppError(
        400,
        'INVALID_DATE_RANGE',
        'endDate must be on or after startDate.',
      );
    }

    // Both bounds inclusive: start of the first day through the last millisecond of the last.
    const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
    const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);

    const [aggregate] = await DocumentModel.aggregate<SummaryAggregate>([
      {
        $match: {
          userId: new Types.ObjectId(req.userId),
          status: 'finalized',
          issueDate: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: null,
          documentCount: { $sum: 1 },
          subtotal: { $sum: '$subtotal' },
          totalDiscount: { $sum: '$totalDiscount' },
          totalTax: { $sum: '$totalTax' },
          grandTotal: { $sum: '$grandTotal' },
        },
      },
    ]);

    const summary = aggregate ?? EMPTY_SUMMARY;

    successResponse(res, 200, 'Report generated successfully.', {
      summary: {
        startDate,
        endDate,
        documentCount: summary.documentCount,
        subtotal: summary.subtotal,
        totalDiscount: summary.totalDiscount,
        totalTax: summary.totalTax,
        grandTotal: summary.grandTotal,
      },
    });
  }),
);

export default router;
