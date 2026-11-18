// Sets up the demo rooms once: registers the four personas, creates each group,
// adds its members, and seeds its conversation through the Nexconn server API.
// A marker file in server/data/ makes seeding happen only once per channel.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Config } from '../config.js';
import type { NexconnClient } from '../nexconn.js';
import { registerRoom, upsertUser } from '../store.js';
import { DEMO_ROOMS, PERSONAS, personaUserId, type DemoRoomSpec } from './personas.js';

const DATA_DIR = new URL('../../data/', import.meta.url);
const SEED_FILE = new URL('demo-seeded.json', DATA_DIR);
const CODE_GROUP_EXISTS = 25409;

type SeedState = Record<string, { seededAt: string; messages: number }>;

async function readSeedState(): Promise<SeedState> {
  try {
    return JSON.parse(await readFile(SEED_FILE, 'utf8')) as SeedState;
  } catch {
    return {};
  }
}

async function markSeeded(channelId: string, messages: number): Promise<void> {
  const state = await readSeedState();
  state[channelId] = { seededAt: new Date().toISOString(), messages };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SEED_FILE, JSON.stringify(state, null, 2));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function demoChannelId(cfg: Config, spec: DemoRoomSpec): string {
  return `${cfg.demo.channelId}${spec.suffix}`.slice(0, 64);
}

let ready: Promise<void> | null = null;

// Safe to call many times; the work runs once per server process.
export function ensureDemoRoom(cfg: Config, nexconn: NexconnClient): Promise<void> {
  if (!ready) {
    ready = setUp(cfg, nexconn).catch((err) => {
      ready = null; // allow a retry on the next request
      throw err;
    });
  }
  return ready;
}

async function setUp(cfg: Config, nexconn: NexconnClient): Promise<void> {
  // 1. Register every persona (issuing a token registers the user and sets the name).
  const uid = (k: keyof typeof PERSONAS) => personaUserId(cfg.demo.channelId, k);
  for (const p of Object.values(PERSONAS)) {
    await nexconn.issueToken(uid(p.key), p.name);
    await upsertUser(uid(p.key), p.name);
  }

  const state = await readSeedState();
  for (const spec of DEMO_ROOMS) {
    const channelId = demoChannelId(cfg, spec);
    const name = spec.suffix === '' ? cfg.demo.channelName : spec.name;

    // 2. Create the group (or confirm it exists), then add its members.
    const created = await nexconn.createGroup(channelId, name, uid(spec.owner));
    if (created !== 0 && created !== CODE_GROUP_EXISTS) {
      throw new Error(`Demo room ${channelId}: create failed with code ${created}`);
    }
    const joined = await nexconn.joinGroup(
      channelId,
      spec.members.map((k) => uid(k)),
    );
    if (joined !== 0) throw new Error(`Demo room ${channelId}: join failed with code ${joined}`);
    await registerRoom(channelId, name, null);

    // 3. Seed the conversation once.
    if (state[channelId]) continue;
    for (const line of spec.script) {
      const p = PERSONAS[line.from];
      const code = await nexconn.sendGroupText(uid(p.key), channelId, line.text, { id: uid(p.key), name: p.name });
      if (code !== 0) throw new Error(`Demo room ${channelId}: seeding stopped at "${line.text}" (code ${code})`);
      await sleep(350); // keeps order and stays far below the 20/s limit
    }
    await markSeeded(channelId, spec.script.length);
    console.log(`[demo] room ${channelId} seeded with ${spec.script.length} messages`);
  }
  console.log(`[demo] rooms ready: ${DEMO_ROOMS.map((s) => demoChannelId(cfg, s)).join(', ')}`);
}
