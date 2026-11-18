import { useEffect, useMemo, useState } from 'react';
import { Sheet } from './Sheet';

interface Props {
  file: File | null;
  onCancel: () => void;
  onSend: (file: File, onProgress: (p: number) => void) => Promise<void>;
}

// Preview a photo before it is sent; shows upload progress while sending.
export function PhotoSendSheet({ file, onCancel, onSend }: Props) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  useEffect(() => {
    setProgress(null);
    setError(null);
  }, [file]);

  async function send() {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      await onSend(file, (p) => setProgress(p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The photo could not be sent.');
      setProgress(null);
    }
  }

  const sending = progress !== null;
  return (
    <Sheet open={file !== null} onClose={() => !sending && onCancel()} title="Send a photo" subtitle={file?.name}>
      {url && (
        <img src={url} alt="Preview of the photo you are about to send" className="mx-auto max-h-[50dvh] w-auto rounded-2xl border border-line object-contain" />
      )}
      {sending && (
        <div className="mt-4" role="status">
          <div className="h-3 w-full overflow-hidden rounded-full bg-fill">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-ink-muted">Uploading… {progress}%</p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          className="min-h-[52px] flex-1 rounded-2xl border-2 border-line-strong bg-surface font-semibold text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="min-h-[52px] flex-1 rounded-2xl bg-accent font-bold text-white hover:bg-accent-deep disabled:opacity-80"
        >
          {sending ? 'Sending…' : 'Send photo'}
        </button>
      </div>
    </Sheet>
  );
}
