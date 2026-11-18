import { useRoomPhoto } from '../../features/settings/profileColors';
import { initialOf } from '../Avatar';
import { TONES } from '../tones';

function toneForRoom(id: string): string {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

// A family: its photo if someone set one, else the first letters of the first
// two words on a colour. Rounded square, so families never look like people.
export function RoomAvatar({ id, name, size = 44 }: { id: string; name: string; size?: number }) {
  const photo = useRoomPhoto(id);
  const words = name.replace(/^the\s+/i, '').split(/\s+/).filter(Boolean);
  const letters = (words.slice(0, 2).map(initialOf).join('') || '?').slice(0, 4);
  return (
    <span
      aria-hidden="true"
      className="relative inline-grid shrink-0 place-items-center overflow-hidden font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: toneForRoom(id),
        fontSize: Math.max(16, Math.round(size * 0.36)),
      }}
    >
      {letters}
      {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    </span>
  );
}
