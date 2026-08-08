import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { DocumentModel, IDocument } from '../models/Document';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const notFound = () =>
  new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');

// Narrows the optional req.document for handlers mounted behind loadDocument. The guarantee
// lives here, with the middleware that establishes it, rather than as a non-null assertion
// repeated at every call site.
export function loadedDocument(req: Request): IDocument {
  if (!req.document) {
    throw notFound();
  }

  return req.document;
}

export const loadDocument = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const { id } = req.params;

    // A malformed id means "no such document" to the client, never a 400 (spec §11.2).
    if (!Types.ObjectId.isValid(id)) {
      throw notFound();
    }

    // Scoped by userId in the filter, so another user's document is indistinguishable
    // from one that does not exist.
    const document = await DocumentModel.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!document) {
      throw notFound();
    }

    req.document = document;
    next();
  },
);
