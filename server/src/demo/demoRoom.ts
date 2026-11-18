// Sets up the demo room once: registers the four personas, creates the group,
// adds everyone, and seeds the conversation through the Nexconn server API.
// A marker file in server/data/ makes the seeding happen only once per channel.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Config } from '../config.js';
import type { NexconnClient } from '../nexconn.js';
import { PERSONAS, SEED_SCRIPT } from './personas.js';

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
  const { channelId, channelName } = cfg.demo;
  const people = Object.values(PERSONAS);

  // 1. Register every persona (issuing a token registers the user and sets the name).
  for (const p of people) await nexconn.issueToken(p.userId, p.name);

  // 2. Create the group (owner: Papa) or confirm it exists, then add everyone.
  const created = await nexconn.createGroup(channelId, channelName, PERSONAS.papa.userId);
  if (created !== 0 && created !== CODE_GROUP_EXISTS) {
    throw new Error(`Demo room: create failed with code ${created}`);
  }
  const joined = await nexconn.joinGroup(
    channelId,
    people.map((p) => p.userId),
  );
  if (joined !== 0) throw new Error(`Demo room: join failed with code ${joined}`);

  // 3. Seed the conversation once.
  const state = await readSeedState();
  if (state[channelId]) {
    console.log(`[demo] room ${channelId} ready (seeded ${state[channelId].seededAt})`);
    return;
  }
  for (const line of SEED_SCRIPT) {
    const p = PERSONAS[line.from];
    const code = await nexconn.sendGroupText(p.userId, channelId, line.text, { id: p.userId, name: p.name });
    if (code !== 0) throw new Error(`Demo room: seeding stopped at "${line.text}" (code ${code})`);
    await sleep(350); // keeps order and stays far below the 20/s limit
  }
  await markSeeded(channelId, SEED_SCRIPT.length);
  console.log(`[demo] room ${channelId} seeded with ${SEED_SCRIPT.length} messages`);
}
