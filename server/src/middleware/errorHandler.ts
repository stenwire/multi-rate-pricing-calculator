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

  // body-parser rejects unparseable JSON before any Zod schema runs. That is a client
  // error, so it must not fall through to the 500 branch and be logged as a server fault.
  // Matching body-parser's own marker keeps application SyntaxErrors on the 500 path.
  if (
    err instanceof SyntaxError &&
    (err as SyntaxError & { type?: string }).type === 'entity.parse.failed'
  ) {
    return errorResponse(
      res,
      400,
      'Request body is not valid JSON.',
      'VALIDATION_ERROR',
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
