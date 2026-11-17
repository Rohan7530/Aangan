// All configuration comes from ../.env (loaded by node --env-file). Nothing is hard-coded.

export type AreaCode = 'SG' | 'NA' | 'SA';

// Base URLs per data center, from docs.nexconn.ai/platform-chat-api/prepare-to-use-api/base-url
const BASE_URLS: Record<AreaCode, { primary: string; backup: string }> = {
  SG: { primary: 'https://api.sg-light-api.com', backup: 'https://api-b.sg-light-api.com' },
  NA: { primary: 'https://api.us-light-api.com', backup: 'https://api-b.us-light-api.com' },
  SA: { primary: 'https://api.sau-light-api.com', backup: 'https://api-b.sau-light-api.com' },
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in .env (see .env.example)`);
  }
  return value;
}

function areaCode(): AreaCode {
  const raw = (process.env.NEXCONN_AREA_CODE ?? 'SG').trim().toUpperCase();
  if (raw === 'SG' || raw === 'NA' || raw === 'SA') return raw;
  throw new Error(`NEXCONN_AREA_CODE must be SG, NA or SA (got "${raw}")`);
}

export function loadConfig() {
  const area = areaCode();
  return {
    port: Number(process.env.PORT ?? 3001),
    nexconn: {
      appKey: required('NEXCONN_APP_KEY'),
      appSecret: required('NEXCONN_APP_SECRET'),
      areaCode: area,
      baseUrls: BASE_URLS[area],
    },
    family: {
      channelId: required('AANGAN_FAMILY_CHANNEL_ID'),
      channelName: process.env.AANGAN_FAMILY_CHANNEL_NAME?.trim() || 'Aangan Family',
    },
  };
}

export type Config = ReturnType<typeof loadConfig>;
