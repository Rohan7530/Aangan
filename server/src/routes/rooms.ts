import { Router, type NextFunction, type Request, type Response } from 'express';
import type { Config } from '../config.js';
import type { NexconnClient } from '../nexconn.js';
import { randomCode, registerRoom, roomByCode, roomInfo, userByKey } from '../store.js';

type Authed = Request & { user?: { userId: string; name: string } };

// App-level auth: the browser sends the authKey it got from /api/login.
async function requireUser(req: Authed, res: Response, next: NextFunction) {
  const key = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const user = key ? await userByKey(key) : null;
  if (!user) {
    res.status(401).json({ error: 'Please join again.' });
    return;
  }
  req.user = user;
  next();
}

const invitePath = (code: string) => `/join/${code}`;

export function roomsRouter(cfg: Config, nexconn: NexconnClient): Router {
  const router = Router();

  // New room: the server creates the Nexconn group (owner = caller) and an invite code.
  router.post('/rooms', requireUser, async (req: Authed, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 1 || name.length > 64) {
      res.status(400).json({ error: 'Room name must be 1-64 characters' });
      return;
    }
    try {
      const channelId = `room${randomCode(12)}`;
      const code = await nexconn.createGroup(channelId, name, req.user!.userId);
      if (code !== 0) throw new Error(`createGroup code ${code}`);
      const invite = await registerRoom(channelId, name, req.user!.userId);
      console.log(`[rooms] ${req.user!.name} created "${name}" (${channelId})`);
      res.json({ channelId, name, invitePath: invitePath(invite) });
    } catch (err) {
      console.error('[rooms] create failed:', err);
      res.status(502).json({ error: 'Could not create the room. Please try again.' });
    }
  });

  // Invite link for a room (default rooms are registered at startup/login).
  router.get('/rooms/:channelId/invite', requireUser, async (req, res) => {
    const room = await roomInfo(String(req.params.channelId));
    if (!room) {
      res.status(404).json({ error: 'No invite link for this room.' });
      return;
    }
    res.json({ name: room.name, invitePath: invitePath(room.code) });
  });

  // Public: what room does this invite open? (shown before joining)
  router.get('/invites/:code', async (req, res) => {
    const room = await roomByCode(String(req.params.code));
    if (!room) {
      res.status(404).json({ error: 'This invite link is not valid.' });
      return;
    }
    res.json({ name: room.name });
  });

  // Join via invite: the server adds the caller to the Nexconn group.
  router.post('/invites/:code/join', requireUser, async (req: Authed, res) => {
    const room = await roomByCode(String(req.params.code));
    if (!room) {
      res.status(404).json({ error: 'This invite link is not valid.' });
      return;
    }
    try {
      const code = await nexconn.joinGroup(room.channelId, [req.user!.userId]);
      if (code !== 0) throw new Error(`joinGroup code ${code}`);
      console.log(`[rooms] ${req.user!.name} joined "${room.name}" by invite`);
      res.json({ channelId: room.channelId, name: room.name });
    } catch (err) {
      console.error('[rooms] join failed:', err);
      res.status(502).json({ error: 'Could not join the room. Please try again.' });
    }
  });

  void cfg;
  return router;
}
