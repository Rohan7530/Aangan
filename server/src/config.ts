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

// AANGAN_ROOM=test switches the server to the separate test channel so automated
// tests never post into the real family room.
function familyChannelId(): { channelId: string; isTestRoom: boolean } {
  const family = required('AANGAN_FAMILY_CHANNEL_ID');
  if (process.env.AANGAN_ROOM !== 'test') return { channelId: family, isTestRoom: false };
  const test = required('AANGAN_TEST_CHANNEL_ID');
  if (test === family) {
    throw new Error('AANGAN_TEST_CHANNEL_ID must differ from AANGAN_FAMILY_CHANNEL_ID');
  }
  return { channelId: test, isTestRoom: true };
}

export function loadConfig() {
  const area = areaCode();
  const room = familyChannelId();
  return {
    port: Number(room.isTestRoom ? process.env.TEST_PORT ?? 3002 : process.env.PORT ?? 3001),
    nexconn: {
      appKey: required('NEXCONN_APP_KEY'),
      appSecret: required('NEXCONN_APP_SECRET'),
      areaCode: area,
      baseUrls: BASE_URLS[area],
    },
    family: {
      channelId: room.channelId,
      channelName: room.isTestRoom
        ? 'Aangan Test Room'
        : process.env.AANGAN_FAMILY_CHANNEL_NAME?.trim() || 'Aangan Family',
      isTestRoom: room.isTestRoom,
    },
    // The showcase/demo room: its own channel, seeded once with a family conversation.
    // In test mode it is derived from the test channel, so tests never touch the real demo room.
    demo: {
      channelId: room.isTestRoom
        ? `${room.channelId}demo`.slice(0, 64)
        : process.env.AANGAN_DEMO_CHANNEL_ID?.trim() || 'aangandemo1',
      channelName: 'The Sharma Family',
    },
  };
}

export type Config = ReturnType<typeof loadConfig>;
