import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import type { Config } from '../config.js';
import { ensureDemoRoom } from '../demo/demoRoom.js';
import type { NexconnClient } from '../nexconn.js';
import { registerRoom, upsertUser } from '../store.js';

export interface LoginResponse {
  userId: string;
  name: string;
  token: string;
  /** App-level key for our own room/invite APIs. */
  authKey: string;
  // Public client config, served from the same .env so the browser needs no env file.
  appKey: string;
  areaCode: Config['nexconn']['areaCode'];
  channelId: string;
  channelName: string;
}

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Platform Chat API status code: "The group channel ID already exists."
const CODE_GROUP_EXISTS = 25409;

// userId = name reduced to lowercase letters/digits + 6 random letters/digits.
// Nexconn user IDs allow only letters and digits, max 64 bytes.
function makeUserId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40) || 'user';
  const bytes = randomBytes(6);
  let suffix = '';
  for (const b of bytes) suffix += ALPHANUM[b % ALPHANUM.length];
  return `${slug}${suffix}`;
}

export function loginRouter(cfg: Config, nexconn: NexconnClient): Router {
  const router = Router();
  const family = cfg.family;
  let familyGroupReady = false;

  // Creates the family group on first use (owner = first user), then adds the user.
  async function ensureMemberOfFamily(userId: string): Promise<void> {
    if (!familyGroupReady) {
      const code = await nexconn.createGroup(family.channelId, family.channelName, userId);
      if (code === 0) {
        console.log(`[login] created family group "${family.channelId}" with owner ${userId}`);
        familyGroupReady = true;
        return; // the owner is a member already
      }
      if (code !== CODE_GROUP_EXISTS) {
        throw new Error(`Could not create group ${family.channelId}: code ${code}`);
      }
      console.log(`[login] family group "${family.channelId}" already exists; joining`);
    }
    const code = await nexconn.joinGroup(family.channelId, [userId]);
    if (code !== 0) {
      throw new Error(`Could not add ${userId} to group ${family.channelId}: code ${code}`);
    }
    familyGroupReady = true;
  }

  router.post('/login', async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 1 || name.length > 64) {
      res.status(400).json({ error: 'Name must be 1-64 characters' });
      return;
    }
    try {
      const userId = makeUserId(name);
      const { token } = await nexconn.issueToken(userId, name);
      await ensureMemberOfFamily(userId);
      await registerRoom(family.channelId, family.channelName, null);
      // Default rooms: the family room and the demo room.
      try {
        await ensureDemoRoom(cfg, nexconn);
        const code = await nexconn.joinGroup(cfg.demo.channelId, [userId]);
        if (code !== 0) console.warn(`[login] could not add ${userId} to the demo room: code ${code}`);
      } catch (err) {
        console.warn('[login] demo room unavailable:', err);
      }
      const authKey = await upsertUser(userId, name);
      const body: LoginResponse = {
        userId,
        name,
        token,
        authKey,
        appKey: cfg.nexconn.appKey,
        areaCode: cfg.nexconn.areaCode,
        channelId: family.channelId,
        channelName: family.channelName,
      };
      console.log(`[login] ${name} -> ${userId}`);
      res.json(body);
    } catch (err) {
      console.error('[login] failed:', err);
      res.status(502).json({ error: err instanceof Error ? err.message : 'Login failed' });
    }
  });

  return router;
}
