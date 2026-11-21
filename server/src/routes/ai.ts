import { Router, type Response } from 'express';
import { AiBadRequest, AiUnavailable, aiStatus, callAi } from '../ai/sidecar.js';
import { requireUser, type Authed } from '../auth.js';
import type { NexconnClient } from '../nexconn.js';
import { byAuthOrIp, rateLimit } from '../rateLimit.js';
import { markSafetyRoom, randomCode, safetyRoomFor, userById } from '../store.js';
import { LANGS, type Lang } from '../translate/engine.js';

// AI features, served by the Python service (ai/) behind our own auth:
//   POST /api/shield/scan        background check of an incoming message
//   POST /api/shield/check       "Is this safe?" for a message from SMS/WhatsApp
//   POST /api/shield/ask-family  send it to a trusted person in a private room
//   POST /api/ai/summary         "What did I miss?"
//   POST /api/ai/replies         one-tap replies
//   GET  /api/ai/status
// The browser never talks to the Python service directly.

export interface ShieldVerdict {
  level: 'safe' | 'caution' | 'danger';
  score: number;
  category: string | null;
  signals: string[];
  title: string;
  advice: string[];
  explanation: string | null;
  engine: 'rules' | 'ai';
  cached: boolean;
}

class BadInput extends Error {}

function text(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string' || !v.trim()) throw new BadInput(`${field} is required`);
  if (v.length > max) throw new BadInput(`${field} is too long (max ${max})`);
  return v.trim();
}
function optText(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}
function lang(v: unknown): Lang {
  if (!LANGS.includes(v as Lang)) throw new BadInput(`lang must be one of ${LANGS.join(', ')}`);
  return v as Lang;
}

// One place that turns failures into calm JSON answers.
function fail(res: Response, err: unknown, unavailable: () => void) {
  if (err instanceof BadInput) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof AiBadRequest) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof AiUnavailable) {
    console.warn(`[ai] unavailable: ${err.message}`);
    unavailable();
  } else {
    console.error('[ai] route failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

const CATEGORY_EN: Record<string, string> = {
  digital_arrest: 'fake police / "digital arrest"',
  kyc_bank: 'fake bank or KYC message',
  otp: 'someone asking for an OTP or PIN',
  lottery_prize: 'fake prize or lottery',
  family_emergency: 'fake family emergency',
  investment: 'fake investment offer',
  job: 'fake job offer',
  parcel_customs: 'fake parcel or customs message',
  utility_bill: 'fake electricity bill',
  link_phishing: 'suspicious link or app',
  payment_request: 'unexpected payment request',
};

export function aiRouter(nexconn: NexconnClient): Router {
  const router = Router();

  router.get('/ai/status', (_req, res) => {
    res.json(aiStatus());
  });

  const scan = (deep: boolean) => async (req: Authed, res: Response) => {
    try {
      const body = { text: text(req.body?.text, 'text', 4000), lang: lang(req.body?.lang), deep };
      res.json(await callAi<ShieldVerdict>('/shield/scan', body, deep ? 25_000 : 8_000));
    } catch (err) {
      fail(res, err, () =>
        res.status(503).json({ error: 'The safety check is resting right now. If a message asks for money, an OTP or secrecy, ask your family first.' }),
      );
    }
  };

  // Every incoming message is checked once per reader language (cached by the AI service).
  router.post('/shield/scan', rateLimit({ windowMs: 60_000, max: 150, key: byAuthOrIp }), requireUser, scan(true));
  router.post(
    '/shield/check',
    rateLimit({ windowMs: 60_000, max: 20, key: byAuthOrIp, message: 'Please wait a minute before checking more messages.' }),
    requireUser,
    scan(true),
  );

  // "Ask my family": a private two-person room between the elder and the trusted
  // person, created on first use, with the message and the check result in it.
  router.post(
    '/shield/ask-family',
    rateLimit({ windowMs: 60_000, max: 6, key: byAuthOrIp, message: 'Your family has been told. Please wait a minute before sending again.' }),
    requireUser,
    async (req: Authed, res) => {
      try {
        const me = req.user!;
        const guardianId = text(req.body?.guardianId, 'guardianId', 64);
        if (!/^[A-Za-z0-9]{1,64}$/.test(guardianId) || guardianId === me.userId) throw new BadInput('Choose someone else in your family');
        const guardian = await userById(guardianId);
        if (!guardian) throw new BadInput('That family member has not joined Aangan yet');
        const message = text(req.body?.text, 'text', 4000);
        const level = req.body?.level === 'danger' || req.body?.level === 'caution' || req.body?.level === 'safe' ? req.body.level : null;
        const category = typeof req.body?.category === 'string' ? req.body.category : null;

        // Random, unguessable ID per (elder, trusted person), remembered in the store.
        let channelId = await safetyRoomFor(me.userId, guardianId);
        if (!channelId) {
          channelId = `safe${randomCode(20)}`;
          const name = `Safety: ${me.name} & ${guardian.name}`.slice(0, 64);
          const created = await nexconn.createGroup(channelId, name, me.userId);
          if (created !== 0) throw new Error(`createGroup code ${created}`);
          const joined = await nexconn.joinGroup(channelId, [me.userId, guardianId]);
          if (joined !== 0) throw new Error(`joinGroup code ${joined}`);
          await markSafetyRoom(channelId, me.userId, guardianId);
        }

        const quoted = message.length > 600 ? `${message.slice(0, 600)}…` : message;
        const verdict =
          level === 'danger'
            ? `Aangan's safety check: likely a scam${category && CATEGORY_EN[category] ? ` (${CATEGORY_EN[category]})` : ''}.`
            : level === 'caution'
              ? `Aangan's safety check: be careful${category && CATEGORY_EN[category] ? ` (${CATEGORY_EN[category]})` : ''}.`
              : level === 'safe'
                ? "Aangan's safety check found nothing worrying, but please confirm."
                : '';
        const out = `🛡️ ${me.name} wants you to check a message they received:\n\n“${quoted}”\n\n${verdict}\nPlease call ${me.name} before they reply or pay anything.`;
        const code = await nexconn.sendGroupText(me.userId, channelId, out.trim(), { id: me.userId, name: me.name });
        if (code !== 0) throw new Error(`sendGroupText code ${code}`);
        console.log(`[shield] ${me.name} asked ${guardian.name} to check a message (${level ?? 'unchecked'})`);
        res.json({ ok: true, channelId, guardianName: guardian.name });
      } catch (err) {
        if (err instanceof BadInput) {
          res.status(400).json({ error: err.message });
          return;
        }
        console.error('[shield] ask-family failed:', err);
        res.status(502).json({ error: 'Could not reach your family just now. Please phone them.' });
      }
    },
  );

  router.post('/ai/summary', rateLimit({ windowMs: 60_000, max: 12, key: byAuthOrIp }), requireUser, async (req: Authed, res) => {
    try {
      const raw = Array.isArray(req.body?.messages) ? (req.body.messages as unknown[]) : [];
      if (raw.length === 0) throw new BadInput('messages is required');
      const messages = raw.slice(-60).map((m) => {
        const o = (m ?? {}) as Record<string, unknown>;
        return {
          sender: optText(o.sender, 40) ?? 'Family member',
          text: text(o.text, 'message text', 2000),
          at: typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : null,
        };
      });
      const body = { lang: lang(req.body?.lang), reader: optText(req.body?.reader, 40), messages };
      res.json(await callAi('/summary', body, 30_000));
    } catch (err) {
      fail(res, err, () => res.status(503).json({ error: 'The summary is resting right now. Please read the messages below.' }));
    }
  });

  router.post('/ai/replies', rateLimit({ windowMs: 60_000, max: 40, key: byAuthOrIp }), requireUser, async (req: Authed, res) => {
    try {
      const body = { lang: lang(req.body?.lang), text: text(req.body?.text, 'text', 2000), sender: optText(req.body?.sender, 40) };
      res.json(await callAi('/replies', body, 15_000));
    } catch (err) {
      fail(res, err, () => res.status(503).json({ error: 'Suggestions are resting right now.' }));
    }
  });

  return router;
}
