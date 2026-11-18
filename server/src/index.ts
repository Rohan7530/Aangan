import express from 'express';
import { loadConfig } from './config.js';
import { NexconnClient } from './nexconn.js';
import { ensureDemoRoom } from './demo/demoRoom.js';
import { demoRouter } from './routes/demo.js';
import { loginRouter } from './routes/login.js';
import { roomsRouter } from './routes/rooms.js';
import { translateRouter } from './routes/translate.js';
import { profileRouter } from './routes/profile.js';
import { fileURLToPath } from 'node:url';
import { MEDIA_DIR } from './media.js';

const cfg = loadConfig();
const nexconn = new NexconnClient(cfg.nexconn);

const app = express();
// Behind a reverse proxy (hosting), set TRUST_PROXY (e.g. 1) so rate limits see real client IPs.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
// Small JSON bodies everywhere, except photo uploads (256px pictures, ~30-80 KB).
const smallJson = express.json({ limit: '16kb' });
const photoJson = express.json({ limit: '400kb' });
app.use((req, res, next) => (req.method === 'POST' && req.path.endsWith('/photo') ? photoJson : smallJson)(req, res, next));
// Profile and family photos (file names carry the user/room id; ?v= changes with the picture).
app.use('/api/media', express.static(fileURLToPath(MEDIA_DIR), { maxAge: '30d', immutable: true, fallthrough: false }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, areaCode: cfg.nexconn.areaCode, channelId: cfg.family.channelId });
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

app.listen(cfg.port, () => {
  const room = cfg.family.isTestRoom ? `TEST room ${cfg.family.channelId}` : `room ${cfg.family.channelId}`;
  console.log(`[server] listening on http://localhost:${cfg.port} (data center ${cfg.nexconn.areaCode}, ${room})`);
  // Prepare the showcase room in the background so the first visitor doesn't wait.
  ensureDemoRoom(cfg, nexconn).catch((err) => console.error('[demo] setup failed:', err));
});
