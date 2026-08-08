import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { errorResponse } from '../utils/response';

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return errorResponse(
        res,
        400,
        'Request validation failed.',
        'VALIDATION_ERROR',
        errors,
      );
    }
    req[source] = result.data;
    next();
  };
}
