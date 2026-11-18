import { Router } from 'express';
import { requireUser, type Authed } from '../auth.js';
import { limits } from '../limits.js';
import { BadImage, removePhoto, savePhoto } from '../media.js';
import { profilesFor, roomPhotosFor, setProfile, setRoomPhoto } from '../store.js';

// Avatar colours people can pick in Settings (white initials at >= 5.3:1).
// Colours from the earlier palette stay valid for people who already chose one.
export const AVATAR_COLORS = ['#0062cc', '#4a3fc4', '#8a35b0', '#c0175a', '#b04a00', '#1e7b34', '#00707a'];
const LEGACY_COLORS = ['#a9461f', '#7a5212', '#5b3a5e', '#1f4a39', '#8a2846', '#1f5a5a', '#2e4a6b'];

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
    if (color !== undefined && !AVATAR_COLORS.includes(color) && !LEGACY_COLORS.includes(color)) {
      res.status(400).json({ error: 'Please pick one of the colours shown.' });
      return;
    }
    await setProfile(req.user!.userId, { name, color });
    res.json({ ok: true, name: name ?? req.user!.name, color });
  });

  // My profile photo (resized to 256px in the browser). { image: dataURL } or { image: null } to remove.
  router.post('/profile/photo', ...limits.profile, requireUser, async (req: Authed, res) => {
    const userId = req.user!.userId;
    try {
      if (req.body?.image === null) {
        await removePhoto(`u_${userId}`);
        await setProfile(userId, { photo: null });
        res.json({ ok: true, photo: null });
        return;
      }
      const photo = await savePhoto(`u_${userId}`, req.body?.image);
      await setProfile(userId, { photo });
      res.json({ ok: true, photo });
    } catch (err) {
      res.status(err instanceof BadImage ? 400 : 500).json({ error: err instanceof Error ? err.message : 'Could not save the picture.' });
    }
  });

  // A family's photo. (Nexconn only lets the group owner change the group's own
  // avatar, code 25405 for others, so the picture lives here for everyone.)
  router.post('/rooms/:channelId/photo', ...limits.profile, requireUser, async (req, res) => {
    const channelId = String(req.params.channelId);
    if (!/^[a-z0-9]{1,64}$/i.test(channelId)) {
      res.status(400).json({ error: 'Unknown family.' });
      return;
    }
    try {
      const photo = await savePhoto(`r_${channelId}`, req.body?.image);
      await setRoomPhoto(channelId, photo);
      res.json({ ok: true, photo });
    } catch (err) {
      res.status(err instanceof BadImage ? 400 : 500).json({ error: err instanceof Error ? err.message : 'Could not save the picture.' });
    }
  });

  // Colours and photos for the members of a room (only for people who set one).
  router.get('/profiles', ...limits.profiles, requireUser, async (req, res) => {
    res.json(await profilesFor(idList(req.query.ids)));
  });

  router.get('/room-photos', ...limits.profiles, requireUser, async (req, res) => {
    res.json({ photos: await roomPhotosFor(idList(req.query.ids)) });
  });

  return router;
}

function idList(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]{1,64}$/i.test(s))
    .slice(0, 200);
}
