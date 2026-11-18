import type { NextFunction, Request, Response } from 'express';

// Small in-memory fixed-window rate limiter (per server process).
export function rateLimit(opts: { windowMs: number; max: number; key: (req: Request) => string; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const k = opts.key(req);
    let h = hits.get(k);
    if (!h || h.resetAt <= now) {
      h = { count: 0, resetAt: now + opts.windowMs };
      hits.set(k, h);
    }
    h.count += 1;
    if (hits.size > 10_000) {
      for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
    }
    if (h.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((h.resetAt - now) / 1000)));
      res.status(429).json({ error: opts.message ?? 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    next();
  };
}

export const byIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown';
export const byAuthOrIp = (req: Request) => (req.headers.authorization ?? '').slice(-24) || byIp(req);
