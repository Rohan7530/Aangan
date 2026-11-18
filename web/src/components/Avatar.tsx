import { MY_DEFAULT_COLOR, useProfileColor, useProfilePhoto } from '../features/settings/profileColors';
import { useTone } from './tones';

// First user-perceived character, so Devanagari names keep their vowel sign.
export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const first = Seg
    ? new Seg(undefined, { granularity: 'grapheme' }).segment(trimmed)[Symbol.iterator]().next().value?.segment
    : undefined;
  return (first ?? [...trimmed][0]).toLocaleUpperCase();
}

interface Props {
  id: string;
  name: string;
  size?: number;
  /** "Me" avatars use the blue accent instead of a member tone. */
  mine?: boolean;
  /** Photo URL carried by a message, used if the member list has none. */
  photo?: string;
}

// A person: their photo if they set one, else their initial on their colour.
export function Avatar({ id, name, size = 36, mine = false, photo }: Props) {
  const tone = useTone(id);
  const picked = useProfileColor(id);
  const src = useProfilePhoto(id) ?? photo;
  return (
    <span
      aria-hidden="true"
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(16, Math.round(size * 0.42)),
        background: mine ? (picked ?? MY_DEFAULT_COLOR) : tone,
      }}
    >
      {initialOf(name)}
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    </span>
  );
}
