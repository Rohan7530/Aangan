// End-to-end smoke test of the server API against the TEST server only.
//   1. npm run dev:test        (server :3002 with TRANSLATE_MOCK=1, test room)
//   2. npm run smoke           (or: node scripts/smoke.mjs http://localhost:3002)
// It refuses to run unless the server reports mock translation, so it never
// uses the real AI quota, and it never posts into any room.

const base = (process.argv[2] ?? 'http://localhost:3002').replace(/\/+$/, '');
let failed = 0;

async function req(method, path, body, authKey) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(authKey ? { Authorization: `Bearer ${authKey}` } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  -> ${detail}` : ''}`);
  if (!ok) failed++;
}

const cfg = await req('GET', '/api/translate/config');
if (cfg.body?.mock !== true) {
  console.error(`Refusing: ${base} is not running with TRANSLATE_MOCK=1. Start it with "npm run dev:test".`);
  process.exit(2);
}

const health = await req('GET', '/api/health');
check('health ok', health.status === 200 && health.body?.ok === true, JSON.stringify(health.body));

// Wait for the AI service to come up (it starts with the server).
for (let i = 0; i < 30; i++) {
  const s = await req('GET', '/api/ai/status');
  if (s.body?.status === 'up') break;
  await new Promise((r) => setTimeout(r, 1000));
}
const ai = await req('GET', '/api/ai/status');
check('AI service up and mocked', ai.body?.status === 'up' && ai.body?.llm === 'mock', JSON.stringify(ai.body));

const login = await req('POST', '/api/login', { name: 'Smoke Test' });
check('login', login.status === 200 && typeof login.body?.authKey === 'string', JSON.stringify(login.body)?.slice(0, 120));
const key = login.body?.authKey;

check('shield needs auth', (await req('POST', '/api/shield/scan', { text: 'hi', lang: 'en' })).status === 401);
check('bad JSON is a 400', (await req('POST', '/api/shield/scan', '{oops', key)).status === 400);
check('bad lang is a 400', (await req('POST', '/api/shield/scan', { text: 'hello', lang: 'xx' }, key)).status === 400);
check('empty text is a 400', (await req('POST', '/api/shield/check', { text: '   ', lang: 'hi' }, key)).status === 400);

const scam = await req(
  'POST',
  '/api/shield/scan',
  { text: 'This is CBI officer. A case is filed on your Aadhaar. You are under digital arrest. Stay on video call and do not tell anyone. Transfer Rs 2 lakh immediately.', lang: 'hi' },
  key,
);
check('digital arrest flagged as danger', scam.body?.level === 'danger', JSON.stringify(scam.body)?.slice(0, 200));
check('advice in Hindi', /[ऀ-ॿ]/.test(`${scam.body?.title ?? ''}${(scam.body?.advice ?? []).join('')}`));

const kyc = await req('POST', '/api/shield/check', { text: 'Dear customer your SBI account will be blocked today. Update KYC at bit.ly/sbi-kyc and share OTP', lang: 'en' }, key);
check('KYC scam flagged', kyc.body?.level === 'danger' || kyc.body?.level === 'caution', JSON.stringify(kyc.body)?.slice(0, 200));

const safe = await req('POST', '/api/shield/scan', { text: 'Dadi, I will pick you up at 12:30 for lunch.', lang: 'hi' }, key);
check('family message is safe', safe.body?.level === 'safe', JSON.stringify(safe.body)?.slice(0, 200));

const replies = await req('POST', '/api/ai/replies', { text: 'Dadi, I will pick you up at 12:30 for lunch.', lang: 'hi', sender: 'Arjun' }, key);
check('three quick replies', Array.isArray(replies.body?.replies) && replies.body.replies.length === 3, JSON.stringify(replies.body));

const summary = await req(
  'POST',
  '/api/ai/summary',
  {
    lang: 'hi',
    reader: 'Dadi',
    messages: [
      { sender: 'Arjun', text: 'I will pick Dadi up at 12:30 for lunch.', at: Date.now() - 60_000 },
      { sender: 'Papa', text: 'Doctor appointment moved to Tuesday 11 am.', at: Date.now() },
    ],
  },
  key,
);
check('summary has lines and speech', Array.isArray(summary.body?.lines) && summary.body.lines.length > 0 && typeof summary.body?.spoken === 'string', JSON.stringify(summary.body)?.slice(0, 200));
check('summary rejects empty list', (await req('POST', '/api/ai/summary', { lang: 'en', messages: [] }, key)).status === 400);

check('ask-family rejects self', (await req('POST', '/api/shield/ask-family', { guardianId: login.body?.userId, text: 'x' }, key)).status === 400);
check('unknown API is a JSON 404', (await req('GET', '/api/nope')).status === 404);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
