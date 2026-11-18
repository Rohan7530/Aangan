import { useSyncExternalStore } from 'react';

// Avatar colours people picked in Settings (kept on our server, shared with
// everyone in their rooms). Each carries white initials at >= 5.9:1.
export const AVATAR_COLORS: { value: string; label: string }[] = [
  { value: '#a9461f', label: 'Terracotta' },
  { value: '#7a5212', label: 'Ochre' },
  { value: '#5b3a5e', label: 'Plum' },
  { value: '#1f4a39', label: 'Forest' },
  { value: '#8a2846', label: 'Rose' },
  { value: '#1f5a5a', label: 'Teal' },
  { value: '#2e4a6b', label: 'Blue' },
];

const colors = new Map<string, string>();
const listeners = new Set<() => void>();

export function setProfileColors(next: Record<string, string>): void {
  let changed = false;
  for (const [id, c] of Object.entries(next)) {
    if (colors.get(id) !== c) {
      colors.set(id, c);
      changed = true;
    }
  }
  if (changed) listeners.forEach((l) => l());
}

export function useProfileColor(userId: string): string | undefined {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => colors.get(userId),
  );
}
