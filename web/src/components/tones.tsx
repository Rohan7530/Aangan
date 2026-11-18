import { createContext, useContext, type ReactNode } from 'react';
import { useProfileColor } from '../features/settings/profileColors';

// A distinct colour per member (iOS-style hues, deepened for contrast): white
// initials at >= 5.3:1, and readable as a name colour on #F2F2F7 at >= 4.7:1.
// Blue is kept out on purpose: it is reserved for my own messages.
export const TONES = ['#4a3fc4', '#8a35b0', '#c0175a', '#b04a00', '#1e7b34', '#00707a'];

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

// A colour the person picked in Settings wins over the assigned tone.
export function useTone(userId: string): string {
  const picked = useProfileColor(userId);
  const assigned = useContext(ToneCtx).get(userId);
  return picked ?? assigned ?? hashTone(userId);
}
