import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { aiStatus, startAiSidecar } from './ai/sidecar.js';
import { loadConfig } from './config.js';
import { NexconnClient } from './nexconn.js';
import { ensureDemoRoom } from './demo/demoRoom.js';
import { MEDIA_DIR } from './media.js';
import { aiRouter } from './routes/ai.js';
import { demoRouter } from './routes/demo.js';
import { loginRouter } from './routes/login.js';
import { profileRouter } from './routes/profile.js';
import { roomsRouter } from './routes/rooms.js';
import { translateRouter } from './routes/translate.js';

const cfg = loadConfig();
const nexconn = new NexconnClient(cfg.nexconn);

const app = express();
app.disable('x-powered-by');
// Behind Render's proxy: use the real client IP for rate limits (one hop by default;
// set TRUST_PROXY to change it).
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : 1);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
// JSON bodies up to 64 KB (AI routes send message batches), except photo uploads
// (256px pictures, ~30-80 KB as data URLs).
const json = express.json({ limit: '64kb' });
const photoJson = express.json({ limit: '400kb' });
app.use((req, res, next) => (req.method === 'POST' && req.path.endsWith('/photo') ? photoJson : json)(req, res, next));
// Profile and family photos (file names carry the user/room id; ?v= changes with the picture).
app.use('/api/media', express.static(fileURLToPath(MEDIA_DIR), { maxAge: '30d', immutable: true, fallthrough: false }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, areaCode: cfg.nexconn.areaCode, channelId: cfg.family.channelId, ai: aiStatus() });
});

// Public room info, so the browser can drop sessions saved for an older room ID.
app.get('/api/config', (_req, res) => {
  res.json({ channelId: cfg.family.channelId, channelName: cfg.family.channelName });
});
app.use('/api', loginRouter(cfg, nexconn));
app.use('/api', demoRouter(cfg, nexconn));
app.use('/api', roomsRouter(cfg, nexconn));
app.use('/api', translateRouter());
app.use('/api', profileRouter());
app.use('/api', aiRouter(nexconn));
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Production (one Render service): serve the built web app, with the SPA
// fallback for /join/:code, /showcase and friends. In dev, Vite does this.
const WEB_DIST = fileURLToPath(new URL('../../web/dist/', import.meta.url));
if (existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root: WEB_DIST });
  });
}

// Malformed JSON, oversized bodies and anything unexpected: a JSON answer, never a stack trace.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  const e = err as { status?: number; type?: string; message?: string };
  if (e?.type === 'entity.parse.failed') return void res.status(400).json({ error: 'Bad JSON' });
  if (e?.type === 'entity.too.large') return void res.status(413).json({ error: 'Too large' });
  console.error('[server] unhandled error:', err);
  res.status(e?.status && e.status < 600 ? e.status : 500).json({ error: 'Something went wrong. Please try again.' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled promise rejection:', reason);
});

const server = app.listen(cfg.port, () => {
  const room = cfg.family.isTestRoom ? `TEST room ${cfg.family.channelId}` : `room ${cfg.family.channelId}`;
  console.log(`[server] listening on http://localhost:${cfg.port} (data center ${cfg.nexconn.areaCode}, ${room})`);
  // Prepare the showcase room in the background so the first visitor doesn't wait.
  ensureDemoRoom(cfg, nexconn).catch((err) => console.error('[demo] setup failed:', err));
});
server.requestTimeout = 60_000;
server.headersTimeout = 65_000;

// AI_SIDECAR=off runs without the Python service (AI features answer 503 calmly).
if (process.env.AI_SIDECAR !== 'off') startAiSidecar(cfg.nexconn.appSecret);
