import { Router } from 'express';
import { requireUser, type Authed } from '../auth.js';
import { limits } from '../limits.js';
import { colorsFor, setProfile } from '../store.js';

// Avatar colours people can pick in Settings. Each carries white initials at
// >= 5.9:1 (AA, and AAA for the large initials).
export const AVATAR_COLORS = ['#a9461f', '#7a5212', '#5b3a5e', '#1f4a39', '#8a2846', '#1f5a5a', '#2e4a6b'];

export function profileRouter(): Router {
  const router = Router();

  // Change my display name and/or avatar colour. (The name is also changed in
  // Nexconn by the browser; this keeps our own records and sign-in in step.)
  router.post('/profile', ...limits.profile, requireUser, async (req: Authed, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : undefined;
    const color = typeof req.body?.color === 'string' ? req.body.color.toLowerCase() : undefined;
    if (name !== undefined && (name.length < 1 || name.length > 64)) {
      res.status(400).json({ error: 'Name must be 1-64 characters.' });
      return;
    }
    if (color !== undefined && !AVATAR_COLORS.includes(color)) {
      res.status(400).json({ error: 'Please pick one of the colours shown.' });
      return;
    }
    await setProfile(req.user!.userId, { name, color });
    res.json({ ok: true, name: name ?? req.user!.name, color });
  });

  // Avatar colours for the members of a room (only for people who chose one).
  router.get('/profiles', ...limits.profiles, requireUser, async (req, res) => {
    const ids = String(req.query.ids ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[a-z0-9]{1,64}$/i.test(s))
      .slice(0, 200);
    res.json({ colors: await colorsFor(ids) });
  });

  return router;
}
