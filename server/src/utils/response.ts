import { Response } from 'express';

export function successResponse(
  res: Response,
  statusCode: number,
  message: string,
  data: unknown = null,
) {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  statusCode: number,
  message: string,
  errorCode: string,
  details?: unknown,
) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    error_code: errorCode,
    ...(details !== undefined && { details }),
  });
}
