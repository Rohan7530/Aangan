import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// Bottom sheet on the native <dialog> element: focus trap, Escape to close and
// focus return come from the browser. Used by "How I read" and "Who's here".
export function Sheet({ open, onClose, title, subtitle, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop
      }}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 pb-4 pt-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[1.5rem] font-bold text-green">
              {title}
            </h2>
            {subtitle && <p className="text-ink-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl bg-green px-6 font-semibold text-white hover:bg-[#173a2c]"
            style={{ minHeight: 'var(--tap, 48px)' }}
          >
            Done
          </button>
        </header>
        <div className="overflow-y-auto px-6 pb-8 pt-5">{children}</div>
      </div>
    </dialog>
  );
}
