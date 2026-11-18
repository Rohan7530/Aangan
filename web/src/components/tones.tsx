import { createContext, useContext, type ReactNode } from 'react';

// A distinct warm colour per member. Every tone carries white initials at
// >= 6.9:1 and works as a name colour on cream at >= 6.3:1. Terracotta is kept
// out on purpose: it is reserved for "my" messages.
export const TONES = ['#7a5212', '#5b3a5e', '#1f4a39', '#8a2846', '#1f5a5a', '#2e4a6b'];

function hashTone(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

// Members sorted by ID get tones in order, so the first six are always distinct
// and every device shows the same colour for the same person.
export function assignTones(userIds: string[]): Map<string, string> {
  const map = new Map<string, string>();
  [...new Set(userIds)].sort().forEach((id, i) => map.set(id, TONES[i % TONES.length]));
  return map;
}

const ToneCtx = createContext<Map<string, string>>(new Map());

export function ToneProvider({ tones, children }: { tones: Map<string, string>; children: ReactNode }) {
  return <ToneCtx.Provider value={tones}>{children}</ToneCtx.Provider>;
}

export function useTone(userId: string): string {
  return useContext(ToneCtx).get(userId) ?? hashTone(userId);
}
