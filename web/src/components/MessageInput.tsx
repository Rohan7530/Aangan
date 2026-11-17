import { useState, type FormEvent } from 'react';

interface Props {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
}

export function MessageInput({ disabled, onSend }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-stone-200 bg-white p-3">
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? 'Waiting for connection…' : 'Type a message'}
          disabled={disabled || sending}
          aria-label="Message"
          autoComplete="off"
          className="flex-1 rounded-xl border border-stone-300 px-4 py-3 text-lg outline-none focus:border-emerald-600 disabled:bg-stone-100"
        />
        <button
          type="submit"
          disabled={disabled || sending || !text.trim()}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-lg font-semibold text-white disabled:bg-stone-300"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
