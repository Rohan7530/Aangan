import { useEffect, useState, type FormEvent } from 'react';
import { createRoom } from '../../api';
import { CheckIcon, CopyIcon } from '../icons';
import { Sheet } from '../Sheet';

interface Props {
  open: boolean;
  authKey: string;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}

// "New room": the server creates the Nexconn group and returns an invite link.
export function NewRoomSheet({ open, authKey, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ channelId: string; name: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      setCreated(null);
      setCopied(false);
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please give the family a name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await createRoom(authKey, trimmed);
      setCreated({ channelId: r.channelId, name: r.name, link: `${window.location.origin}${r.invitePath}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the family.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="New family" subtitle={created ? 'Share the link so they can join.' : 'A group for your family, or part of it.'}>
      {created ? (
        <div>
          <p className="font-semibold">“{created.name}” is ready.</p>
          <p className="mt-3 font-bold">Invite link</p>
          <p className="mt-1 break-all rounded-xl border border-line bg-surface px-3 py-2 text-ink" data-testid="new-room-link">
            {created.link}
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(created.link);
                  setCopied(true);
                } catch {
                  // clipboard blocked
                }
              }}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-accent font-semibold text-accent-ink hover:bg-accent-soft"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => {
                onCreated(created.channelId);
                onClose();
              }}
              className="min-h-[52px] flex-1 rounded-2xl bg-accent font-bold text-on-accent hover:bg-accent-deep"
            >
              Open family
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <label htmlFor="new-room-name" className="block font-bold">
            Family name
          </label>
          <input
            id="new-room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            placeholder="e.g. Cousins, Diwali plans"
            aria-invalid={error ? true : undefined}
            className="mt-2 min-h-[56px] w-full rounded-2xl border border-line-strong bg-surface px-4 text-ink text-[1.125rem] focus:border-accent focus-visible:outline-offset-1"
          />
          {error && (
            <p role="alert" className="mt-2 font-semibold text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 min-h-[56px] w-full rounded-2xl bg-accent text-[1.125rem] font-bold text-on-accent hover:bg-accent-deep disabled:opacity-80"
          >
            {busy ? 'Creating…' : 'Create family'}
          </button>
        </form>
      )}
    </Sheet>
  );
}
