import express from 'express';
import { loadConfig } from './config.js';
import { NexconnClient } from './nexconn.js';
import { loginRouter } from './routes/login.js';

const cfg = loadConfig();
const nexconn = new NexconnClient(cfg.nexconn);

const app = express();
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, areaCode: cfg.nexconn.areaCode, channelId: cfg.family.channelId });
});
app.use('/api', loginRouter(cfg, nexconn));

app.listen(cfg.port, () => {
  console.log(`[server] listening on http://localhost:${cfg.port} (data center ${cfg.nexconn.areaCode})`);
});
