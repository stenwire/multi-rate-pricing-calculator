import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { loadDocument, loadedDocument } from '../middleware/loadDocument';
import { requireDraft } from '../middleware/requireDraft';
import { validate } from '../middleware/validate';
import { DocumentModel } from '../models/Document';
import {
  recalculateDocument,
  toPersistedLineItem,
} from '../services/documentTotals';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import {
  CreateDocumentBody,
  ListDocumentsQuery,
  UpdateDocumentBody,
  createDocumentSchema,
  listDocumentsSchema,
  updateDocumentSchema,
} from '../validators/document.validators';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /documents:
 *   get:
 *     tags: [Documents]
 *     summary: List the authenticated user's documents
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, finalized] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Documents retrieved successfully.
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
 *                         documents:
 *                           type: array
 *                           items: { $ref: '#/components/schemas/Document' }
 *                         pagination: { $ref: '#/components/schemas/Pagination' }
 *       400: { description: 'VALIDATION_ERROR', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  '/',
  validate(listDocumentsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query as unknown as ListDocumentsQuery;

    // Scoped by userId in the filter, never post-filtered (spec §16.1).
    const filter = status
      ? { userId: req.userId, status }
      : { userId: req.userId };

    const [documents, total] = await Promise.all([
      DocumentModel.find(filter)
        .sort({ issueDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DocumentModel.countDocuments(filter),
    ]);

    successResponse(res, 200, 'Documents retrieved successfully.', {
      documents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

/**
 * @openapi
 * /documents:
 *   post:
 *     tags: [Documents]
 *     summary: Create a draft document
 *     description: >
 *       Line items are optional. Any computed monetary field or status sent by the client
 *       is silently ignored; every total is calculated server-side.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, customer, issueDate]
 *             properties:
 *               title: { type: string, maxLength: 200, example: Q1 Services }
 *               customer: { type: string, maxLength: 200, example: Acme Corp }
 *               issueDate: { type: string, format: date, example: '2026-01-15' }
 *               lineItems:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/LineItemInput' }
 *     responses:
 *       201:
 *         description: Document created successfully.
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
 */
router.post(
  '/',
  validate(createDocumentSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CreateDocumentBody;

    const document = new DocumentModel({
      userId: req.userId,
      title: body.title,
      customer: body.customer,
      issueDate: body.issueDate,
      lineItems: body.lineItems.map(toPersistedLineItem),
    });

    recalculateDocument(document);
    await document.save();

    successResponse(res, 201, 'Document created successfully.', document);
  }),
);

/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get one document with its line items and totals
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Document' }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: 'DOCUMENT_NOT_FOUND — also returned when the document belongs to another user', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get('/:id', loadDocument, (req, res) => {
  successResponse(
    res,
    200,
    'Document retrieved successfully.',
    loadedDocument(req),
  );
});

/**
 * @openapi
 * /documents/{id}:
 *   put:
 *     tags: [Documents]
 *     summary: Update document metadata (draft only)
 *     description: Line items, status and computed totals are ignored if sent.
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title: { type: string, maxLength: 200 }
 *               customer: { type: string, maxLength: 200 }
 *               issueDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Document updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Document' }
 *       400: { description: 'VALIDATION_ERROR or empty body', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: 'DOCUMENT_FINALIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: 'DOCUMENT_NOT_FOUND', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.put(
  '/:id',
  loadDocument,
  requireDraft,
  validate(updateDocumentSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateDocumentBody;
    const document = loadedDocument(req);

    if (body.title !== undefined) {
      document.title = body.title;
    }
    if (body.customer !== undefined) {
      document.customer = body.customer;
    }
    if (body.issueDate !== undefined) {
      document.issueDate = body.issueDate;
    }

    await document.save();

    successResponse(res, 200, 'Document updated successfully.', document);
  }),
);

/**
 * @openapi
 * /documents/{id}:
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a draft document
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document deleted successfully. `data` is null.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: 'DOCUMENT_FINALIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: 'DOCUMENT_NOT_FOUND', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.delete(
  '/:id',
  loadDocument,
  requireDraft,
  asyncHandler(async (req, res) => {
    await DocumentModel.deleteOne({
      _id: loadedDocument(req)._id,
      userId: req.userId,
    });

    successResponse(res, 200, 'Document deleted successfully.', null);
  }),
);

/**
 * @openapi
 * /documents/{id}/finalize:
 *   post:
 *     tags: [Documents]
 *     summary: Transition a draft document to finalized
 *     description: >
 *       One-way and irreversible. Uses a conditional update filtered on status so two
 *       concurrent requests cannot both succeed; the loser receives 409 ALREADY_FINALIZED.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document finalized successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Document' }
 *       400: { description: 'NO_LINE_ITEMS', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: 'UNAUTHORIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: 'DOCUMENT_FINALIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: 'DOCUMENT_NOT_FOUND', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: 'ALREADY_FINALIZED', content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  '/:id/finalize',
  loadDocument,
  requireDraft,
  asyncHandler(async (req, res) => {
    const document = loadedDocument(req);

    if (document.lineItems.length === 0) {
      throw new AppError(
        400,
        'NO_LINE_ITEMS',
        'Cannot finalize a document with no line items.',
      );
    }

    // Conditional on status rather than a read-then-write, so a concurrent finalize cannot
    // slip between the requireDraft check and this update.
    const finalized = await DocumentModel.findOneAndUpdate(
      { _id: document._id, userId: req.userId, status: 'draft' },
      { $set: { status: 'finalized' } },
      { new: true },
    );

    if (!finalized) {
      throw new AppError(
        409,
        'ALREADY_FINALIZED',
        'This document is already finalized.',
      );
    }

    successResponse(res, 200, 'Document finalized successfully.', finalized);
  }),
);

export default router;
