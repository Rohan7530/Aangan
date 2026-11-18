import { useEffect, useRef, useState } from 'react';

// A small, fully local emoji picker (no network, no dependency): five tabs of
// emojis families actually use. Arrow-free and simple: every emoji is a button,
// Escape closes, focus returns to the trigger.
const SETS: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    icon: '😊',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤗', '🤔', '😴', '🥺', '😢', '😭', '😮', '😱', '😤', '🥳', '😌'],
  },
  {
    label: 'Gestures',
    icon: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '👋', '🤝', '💪', '👌', '✌️', '🤞', '👀', '🫶', '🤲', '☝️', '👆'],
  },
  {
    label: 'Hearts',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💕', '💖', '💗', '💯', '✨', '🌟', '💐'],
  },
  {
    label: 'Food',
    icon: '☕',
    emojis: ['☕', '🫖', '🍵', '🍛', '🍚', '🥘', '🫓', '🥭', '🍌', '🍎', '🍉', '🍰', '🎂', '🍬', '🥛', '🍲'],
  },
  {
    label: 'Celebrate',
    icon: '🎉',
    emojis: ['🎉', '🎊', '🎁', '🪔', '🎈', '🌸', '🌼', '🌞', '🌙', '⭐', '🏏', '📷', '🎶', '🛕', '🏠', '🚗'],
  },
];

interface Props {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onPick, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.emoji-grid button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} role="dialog" aria-label="Choose an emoji" className="emoji-popover">
      <div role="tablist" aria-label="Emoji groups" className="flex gap-1 border-b border-line px-2 pt-2">
        {SETS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-selected={tab === i}
            aria-label={s.label}
            title={s.label}
            onClick={() => setTab(i)}
            className={`grid h-12 w-12 place-items-center rounded-t-xl text-[1.375rem] ${
              tab === i ? 'bg-accent-soft shadow-[inset_0_-3px_0_var(--color-accent)]' : 'hover:bg-fill'
            }`}
          >
            {s.icon}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={SETS[tab].label} className="emoji-grid grid grid-cols-6 gap-1 p-2">
        {SETS[tab].emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="grid h-12 w-12 place-items-center rounded-xl text-[1.5rem] hover:bg-fill"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
