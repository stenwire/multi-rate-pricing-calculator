import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { errorResponse } from '../utils/response';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return errorResponse(
      res,
      err.statusCode,
      err.message,
      err.code,
      err.details,
    );
  }

  console.error('Unhandled error:', err);
  return errorResponse(
    res,
    500,
    'An unexpected error occurred.',
    'INTERNAL_SERVER_ERROR',
  );
}
