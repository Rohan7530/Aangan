// Tiny JSON-file store for app data Nexconn does not keep for us:
// app auth keys (so room APIs know who is calling) and room invite codes.
// Lives in server/data/ (git-ignored). Writes are serialized.

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const DATA_DIR = new URL('../data/', import.meta.url);
const FILE = new URL('store.json', DATA_DIR);

interface StoreData {
  users: Record<string, { name: string; authKey: string; color?: string; photo?: string }>;
  roomPhotos: Record<string, string>;
  rooms: Record<string, { name: string; code: string; createdBy: string | null; createdAt: string }>;
}

let data: StoreData | null = null;
let writing: Promise<void> = Promise.resolve();

async function load(): Promise<StoreData> {
  if (data) return data;
  try {
    data = JSON.parse(await readFile(FILE, 'utf8')) as StoreData;
  } catch {
    data = { users: {}, rooms: {}, roomPhotos: {} };
  }
  data.users ??= {};
  data.rooms ??= {};
  data.roomPhotos ??= {};
  return data;
}

function save(): Promise<void> {
  writing = writing.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(data, null, 2));
  });
  return writing;
}

const ALNUM = 'abcdefghijkmnpqrstuvwxyz23456789'; // no look-alikes (l/1, o/0)
export function randomCode(length: number): string {
  let out = '';
  for (const b of randomBytes(length)) out += ALNUM[b % ALNUM.length];
  return out;
}

// ---- users -------------------------------------------------------------------

export async function upsertUser(userId: string, name: string): Promise<string> {
  const d = await load();
  const existing = d.users[userId];
  const authKey = existing?.authKey ?? randomBytes(24).toString('hex');
  d.users[userId] = { ...existing, name, authKey };
  await save();
  return authKey;
}

export async function userByKey(authKey: string): Promise<{ userId: string; name: string } | null> {
  const d = await load();
  for (const [userId, u] of Object.entries(d.users)) if (u.authKey === authKey) return { userId, name: u.name };
  return null;
}

// Profile changes from Settings (display name, avatar colour).
// Profile changes from Settings (display name, avatar colour, photo path; photo null = removed).
export async function setProfile(userId: string, patch: { name?: string; color?: string; photo?: string | null }): Promise<void> {
  const d = await load();
  const u = d.users[userId];
  if (!u) return;
  if (patch.name) u.name = patch.name;
  if (patch.color) u.color = patch.color;
  if (patch.photo === null) delete u.photo;
  else if (patch.photo) u.photo = patch.photo;
  await save();
}

export async function profilesFor(userIds: string[]): Promise<{ colors: Record<string, string>; photos: Record<string, string> }> {
  const d = await load();
  const colors: Record<string, string> = {};
  const photos: Record<string, string> = {};
  for (const id of userIds) {
    const u = d.users[id];
    if (u?.color) colors[id] = u.color;
    if (u?.photo) photos[id] = u.photo;
  }
  return { colors, photos };
}

export async function setRoomPhoto(channelId: string, photo: string): Promise<void> {
  const d = await load();
  d.roomPhotos[channelId] = photo;
  await save();
}

export async function roomPhotosFor(channelIds: string[]): Promise<Record<string, string>> {
  const d = await load();
  const out: Record<string, string> = {};
  for (const id of channelIds) if (d.roomPhotos[id]) out[id] = d.roomPhotos[id];
  return out;
}

// ---- rooms + invites -----------------------------------------------------------

export async function registerRoom(channelId: string, name: string, createdBy: string | null): Promise<string> {
  const d = await load();
  const existing = d.rooms[channelId];
  if (existing) {
    if (existing.name !== name) {
      existing.name = name;
      await save();
    }
    return existing.code;
  }
  const code = randomCode(8);
  d.rooms[channelId] = { name, code, createdBy, createdAt: new Date().toISOString() };
  await save();
  return code;
}

export async function roomByCode(code: string): Promise<{ channelId: string; name: string } | null> {
  const d = await load();
  for (const [channelId, r] of Object.entries(d.rooms)) if (r.code === code) return { channelId, name: r.name };
  return null;
}

export async function roomInfo(channelId: string): Promise<{ name: string; code: string } | null> {
  const d = await load();
  const r = d.rooms[channelId];
  return r ? { name: r.name, code: r.code } : null;
}
