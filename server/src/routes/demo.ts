import { Router } from 'express';
import type { Config } from '../config.js';
import { ensureDemoRoom } from '../demo/demoRoom.js';
import { isPersonaKey, PERSONAS } from '../demo/personas.js';
import type { NexconnClient } from '../nexconn.js';

// No-login sessions for the showcase. They only ever give access to the demo
// room as one of the four demo personas, never to the real family room.
export function demoRouter(cfg: Config, nexconn: NexconnClient): Router {
  const router = Router();

  router.get('/demo/personas', (_req, res) => {
    res.json(Object.values(PERSONAS).map(({ key, name, label, mode }) => ({ key, name, label, mode })));
  });

  router.post('/demo/session', async (req, res) => {
    const key = req.body?.persona;
    if (!isPersonaKey(key)) {
      res.status(400).json({ error: 'Unknown demo persona' });
      return;
    }
    try {
      await ensureDemoRoom(cfg, nexconn);
      const p = PERSONAS[key];
      const { token } = await nexconn.issueToken(p.userId, p.name);
      res.json({
        userId: p.userId,
        name: p.name,
        token,
        appKey: cfg.nexconn.appKey,
        areaCode: cfg.nexconn.areaCode,
        channelId: cfg.demo.channelId,
        channelName: cfg.demo.channelName,
        mode: p.mode,
        label: p.label,
      });
    } catch (err) {
      console.error('[demo] session failed:', err);
      res.status(502).json({ error: 'The demo room is not available right now.' });
    }
  });

  return router;
}
