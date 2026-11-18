import { useEffect, useRef } from 'react';
import { CloseIcon } from './icons';

interface Props {
  image: { url: string; alt: string } | null;
  onClose: () => void;
}

// Full-size photo on a dark backdrop. Native <dialog>: Escape closes, focus returns.
export function Lightbox({ image, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (image && !d.open) d.showModal();
    if (!image && d.open) d.close();
  }, [image]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={image?.alt ?? 'Photo'}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {image && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-white/95 px-4 font-semibold text-ink"
          >
            <CloseIcon />
            Close
          </button>
          <img src={image.url} alt={image.alt} className="max-h-[85dvh] max-w-full rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </dialog>
  );
}
