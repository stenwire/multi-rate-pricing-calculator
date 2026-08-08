import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export function requireDraft(req: Request, _res: Response, next: NextFunction) {
  if (req.document?.status !== 'draft') {
    throw new AppError(
      403,
      'DOCUMENT_FINALIZED',
      'Cannot modify a finalized document.',
    );
  }

  next();
}
