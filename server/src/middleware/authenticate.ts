import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const BEARER_PREFIX = 'Bearer ';

// Missing, malformed, tampered and expired tokens are all indistinguishable to the client.
const unauthorized = () =>
  new AppError(401, 'UNAUTHORIZED', 'Authentication required.');

// The JWT alone is authoritative: no database lookup per request. A token outliving its
// user is accepted scope (spec §11.1).
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith(BEARER_PREFIX)) {
    throw unauthorized();
  }

  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(header.slice(BEARER_PREFIX.length), env.JWT_SECRET);
  } catch {
    throw unauthorized();
  }

  if (typeof payload === 'string' || typeof payload.userId !== 'string') {
    throw unauthorized();
  }

  req.userId = payload.userId;
  next();
}
