import { initialOf } from '../Avatar';
import { TONES } from '../tones';

function toneForRoom(id: string): string {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

// Rounded-square room badge: first letters of the first two words.
export function RoomAvatar({ id, name, size = 44 }: { id: string; name: string; size?: number }) {
  const words = name.replace(/^the\s+/i, '').split(/\s+/).filter(Boolean);
  const letters = (words.slice(0, 2).map(initialOf).join('') || '?').slice(0, 4);
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center rounded-2xl font-bold text-white"
      style={{ width: size, height: size, background: toneForRoom(id), fontSize: Math.max(16, Math.round(size * 0.36)) }}
    >
      {letters}
    </span>
  );
}
