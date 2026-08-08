import { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 does not catch rejected promises, so an async handler's errors would
// otherwise bypass the global error handler entirely.
export function asyncHandler(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
