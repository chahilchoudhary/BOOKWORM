import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z, type ZodType } from 'zod';
import { env } from './config/env.js';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface AuthedRequest extends Request {
  userId: number;
}

function readToken(req: Request): number | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as { sub: string };
    return Number(payload.sub);
  } catch {
    return null;
  }
}

/** Login required. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const id = readToken(req);
  if (!id) return next(new HttpError(401, 'Please log in'));
  (req as AuthedRequest).userId = id;
  next();
};

/** Login optional (for personalised-but-public pages). */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const id = readToken(req);
  if (id) (req as AuthedRequest).userId = id;
  next();
};

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: '8h' });
}

/** Parse + validate; throws HttpError(400) with a readable message. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join('.') || 'input';
    throw new HttpError(400, `${where}: ${first?.message ?? 'invalid'}`);
  }
  return result.data;
}

/** Wrap handlers so thrown errors reach the error middleware. */
export const wrap =
  (fn: (req: Request, res: Response) => unknown): RequestHandler =>
  (req, res, next) => {
    try {
      fn(req, res);
    } catch (e) {
      next(e);
    }
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
}

export { z };
