import { useSyncExternalStore } from 'react';

// Avatar colours and photos people set in Settings, and family photos (kept on
// our server, shared with everyone in their rooms). Each colour carries white
// initials at >= 5.3:1 and works as name text on the light background at >= 4.7:1.
export const MY_DEFAULT_COLOR = '#0062cc';
export const AVATAR_COLORS: { value: string; label: string }[] = [
  { value: '#0062cc', label: 'Blue' },
  { value: '#4a3fc4', label: 'Indigo' },
  { value: '#8a35b0', label: 'Purple' },
  { value: '#c0175a', label: 'Pink' },
  { value: '#b04a00', label: 'Orange' },
  { value: '#1e7b34', label: 'Green' },
  { value: '#00707a', label: 'Teal' },
];

function createStore() {
  const map = new Map<string, string>();
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  return {
    set(next: Record<string, string | null>) {
      let changed = false;
      for (const [id, v] of Object.entries(next)) {
        if (v === null) changed = map.delete(id) || changed;
        else if (map.get(id) !== v) {
          map.set(id, v);
          changed = true;
        }
      }
      if (changed) listeners.forEach((l) => l());
    },
    use(id: string): string | undefined {
      return useSyncExternalStore(subscribe, () => map.get(id));
    },
  };
}

const colors = createStore();
const photos = createStore();
const roomPhotos = createStore();

export const setProfileColors = (next: Record<string, string>) => colors.set(next);
export const useProfileColor = (userId: string) => colors.use(userId);
export const setProfilePhotos = (next: Record<string, string | null>) => photos.set(next);
export const useProfilePhoto = (userId: string) => photos.use(userId);
export const setRoomPhotos = (next: Record<string, string | null>) => roomPhotos.set(next);
export const useRoomPhoto = (channelId: string) => roomPhotos.use(channelId);
