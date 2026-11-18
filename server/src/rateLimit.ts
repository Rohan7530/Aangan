import type { NextFunction, Request, Response } from 'express';

// Small in-memory fixed-window rate limiter (per server process).
// RATE_LIMIT_SCALE multiplies every limit (the test server raises it, because
// test suites sign in many people from one machine).
const SCALE = Number(process.env.RATE_LIMIT_SCALE) > 0 ? Number(process.env.RATE_LIMIT_SCALE) : 1;
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
    if (h.count > Math.max(1, Math.round(opts.max * SCALE))) {
      const retryAfter = Math.ceil((h.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      const wait = retryAfter <= 90 ? 'a minute' : `about ${Math.ceil(retryAfter / 60)} minutes`;
      res.status(429).json({ error: `${opts.message ?? 'Too many requests.'} Please try again in ${wait}.`, retryAfter });
      return;
    }
    next();
  };
}

export const byIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown';
export const byAuthOrIp = (req: Request) => (req.headers.authorization ?? '').slice(-24) || byIp(req);
