import { useProfileColor } from '../features/settings/profileColors';
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
  /** "Me" avatars use the terracotta accent instead of a member tone. */
  mine?: boolean;
}

export function Avatar({ id, name, size = 36, mine = false }: Props) {
  const tone = useTone(id);
  const picked = useProfileColor(id);
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(16, Math.round(size * 0.44)),
        background: mine ? (picked ?? '#a9461f') : tone,
      }}
    >
      {initialOf(name)}
    </span>
  );
}
