import type { NextFunction, Request, Response } from 'express';
import { userByKey } from './store.js';

export type Authed = Request & { user?: { userId: string; name: string } };

// App-level auth: the browser sends the authKey it got from /api/login.
export async function requireUser(req: Authed, res: Response, next: NextFunction) {
  const key = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const user = key ? await userByKey(key) : null;
  if (!user) {
    res.status(401).json({ error: 'Please join again.' });
    return;
  }
  req.user = user;
  next();
}
