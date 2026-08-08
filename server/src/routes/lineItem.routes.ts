import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/authenticate';
import { loadDocument, loadedDocument } from '../middleware/loadDocument';
import { requireDraft } from '../middleware/requireDraft';
import { validate } from '../middleware/validate';
import { IDocument } from '../models/Document';
import {
  recalculateDocument,
  toPersistedLineItem,
} from '../services/documentTotals';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import {
  LineItemInputBody,
  UpdateLineItemBody,
  createLineItemSchema,
  updateLineItemSchema,
} from '../validators/lineItem.validators';

const router = Router();

router.use(authenticate);

function findLineItem(document: IDocument, lineItemId: string) {
  // An unparseable id means "no such line item", mirroring how loadDocument treats :id.
  const lineItem = Types.ObjectId.isValid(lineItemId)
    ? document.lineItems.id(lineItemId)
    : null;

  if (!lineItem) {
    throw new AppError(404, 'LINE_ITEM_NOT_FOUND', 'Line item not found.');
  }

  return lineItem;
}

/**
 * @openapi
 * /documents/{id}/line-items:
 *   post:
 *     tags: [Line items]
 *     summary: Add a line item to a draft document
 *     description: >
 *       Computed monetary fields sent by the client are ignored. The line is priced and the
 *       document totals recomputed server-side before saving.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LineItemInput' }
 *     responses:
 *       201:
 *         description: Line item added successfully. Returns the full updated document.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Document' }
 *       400: { description: 'VALIDATION_ERROR', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: 'DOCUMENT_FINALIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: 'DOCUMENT_NOT_FOUND', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  '/:id/line-items',
  loadDocument,
  requireDraft,
  validate(createLineItemSchema),
  asyncHandler(async (req, res) => {
    const document = loadedDocument(req);

    document.lineItems.push(toPersistedLineItem(req.body as LineItemInputBody));
    recalculateDocument(document);
    await document.save();

    successResponse(res, 201, 'Line item added successfully.', document);
  }),
);

/**
 * @openapi
 * /documents/{id}/line-items/{lineItemId}:
 *   put:
 *     tags: [Line items]
 *     summary: Update a line item on a draft document
 *     description: Partial update. Any field omitted keeps its current value.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: lineItemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               description: { type: string, maxLength: 300 }
 *               quantity: { type: integer, minimum: 1 }
 *               unitPrice: { type: integer, minimum: 0 }
 *               discount:
 *                 nullable: true
 *                 $ref: '#/components/schemas/Discount'
 *               taxPercent: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200:
 *         description: Line item updated successfully. Returns the full updated document.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Document' }
 *       400: { description: 'VALIDATION_ERROR', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: 'DOCUMENT_FINALIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: 'DOCUMENT_NOT_FOUND or LINE_ITEM_NOT_FOUND', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.put(
  '/:id/line-items/:lineItemId',
  loadDocument,
  requireDraft,
  validate(updateLineItemSchema),
  asyncHandler(async (req, res) => {
    const document = loadedDocument(req);
    const lineItem = findLineItem(document, req.params.lineItemId);
    const body = req.body as UpdateLineItemBody;

    if (body.description !== undefined) {
      lineItem.description = body.description;
    }
    if (body.quantity !== undefined) {
      lineItem.quantity = body.quantity;
    }
    if (body.unitPrice !== undefined) {
      lineItem.unitPrice = body.unitPrice;
    }
    if (body.discount !== undefined) {
      lineItem.discount = body.discount;
    }
    if (body.taxPercent !== undefined) {
      lineItem.taxPercent = body.taxPercent;
    }

    recalculateDocument(document);
    await document.save();

    successResponse(res, 200, 'Line item updated successfully.', document);
  }),
);

/**
 * @openapi
 * /documents/{id}/line-items/{lineItemId}:
 *   delete:
 *     tags: [Line items]
 *     summary: Remove a line item from a draft document
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: lineItemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Line item removed successfully. Returns the full updated document.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Document' }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: 'DOCUMENT_FINALIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: 'DOCUMENT_NOT_FOUND or LINE_ITEM_NOT_FOUND', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.delete(
  '/:id/line-items/:lineItemId',
  loadDocument,
  requireDraft,
  asyncHandler(async (req, res) => {
    const document = loadedDocument(req);

    findLineItem(document, req.params.lineItemId).deleteOne();
    recalculateDocument(document);
    await document.save();

    successResponse(res, 200, 'Line item removed successfully.', document);
  }),
);

export default router;
