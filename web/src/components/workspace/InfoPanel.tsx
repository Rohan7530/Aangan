import { useEffect, useState, type Ref } from 'react';
import { getRoomInvite } from '../../api';
import type { Member } from '../../nexconn/group';
import type { PresenceMap } from '../../nexconn/presence';
import { Avatar } from '../Avatar';
import { CheckIcon, CloseIcon, CopyIcon, HeartIcon, LinkIcon } from '../icons';

interface Props {
  channelId: string;
  roomName: string;
  members: Member[];
  presence: PresenceMap | null;
  myId: string;
  authKey: string;
  onClose: () => void;
  fullWidth?: boolean;
  /** Comfort: larger text and rows, and a big labelled Close button at the top. */
  size?: 'standard' | 'comfort';
  /** Comfort moves focus here when the panel opens. */
  closeRef?: Ref<HTMLButtonElement>;
  id?: string;
}

// Room info: who is here (with online dots), the invite link, and a reserved
// "Family check-in" section for the next feature. One component for both modes;
// Comfort only changes the sizing.
export function InfoPanel({ channelId, roomName, members, presence, myId, authKey, onClose, fullWidth, size = 'standard', closeRef, id }: Props) {
  const comfort = size === 'comfort';
  const [invite, setInvite] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setInvite(null);
    setInviteError(null);
    getRoomInvite(authKey, channelId)
      .then((r) => !cancelled && setInvite(`${window.location.origin}${r.invitePath}`))
      .catch((e) => !cancelled && setInviteError(e instanceof Error ? e.message : 'No invite link'));
    return () => {
      cancelled = true;
    };
  }, [authKey, channelId]);

  const online = (id: string) => id === myId || presence?.[id] === true;
  const sorted = [...members].sort((a, b) => Number(online(b.userId)) - Number(online(a.userId)) || a.name.localeCompare(b.name));
  const onlineCount = presence ? members.filter((m) => online(m.userId)).length : null;

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the link is still visible and selectable
    }
  }

  return (
    <aside
      id={id}
      aria-label={`About ${roomName}`}
      className={`flex h-full shrink-0 flex-col bg-cream ${comfort ? 'comfort-info border-l-2 border-line' : 'border-l border-line'} ${
        fullWidth ? 'w-full' : comfort ? 'w-[400px]' : 'w-[272px] xl:w-[300px]'
      }`}
    >
      {comfort ? (
        <header className="flex flex-col gap-3 border-b-2 border-line px-5 pb-4 pt-4">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-green bg-surface text-[1.375rem] font-bold text-green hover:bg-green-soft"
          >
            <CloseIcon />
            <span>Close</span>
          </button>
          <h2 className="text-[1.5rem] font-bold leading-tight text-green">About {roomName}</h2>
        </header>
      ) : (
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate text-[1.25rem] font-bold text-green">Room info</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close room info"
            className="grid h-12 w-12 place-items-center rounded-2xl text-ink-muted hover:bg-sand hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${comfort ? 'px-5 py-5 text-[1.25rem]' : 'px-4 py-4'}`}>
        <section aria-labelledby="info-members">
          <h3 id="info-members" className={comfort ? 'text-[1.5rem] font-bold' : 'font-bold'}>
            Members{' '}
            <span className="font-semibold text-ink-muted">
              · {members.length}
              {onlineCount !== null && `, ${onlineCount} online`}
            </span>
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {sorted.map((m) => {
              const on = online(m.userId);
              return (
                <li key={m.userId} className={`flex items-center gap-3 rounded-2xl px-2 ${comfort ? 'min-h-[72px]' : 'min-h-[52px]'}`}>
                  <span className="relative">
                    <Avatar id={m.userId} name={m.name || '?'} size={comfort ? 56 : 40} mine={m.userId === myId} />
                    {presence && (
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-cream ${comfort ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${on ? 'bg-green' : 'bg-line-strong'}`}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${comfort ? 'text-[1.375rem] font-bold' : 'font-semibold'}`}>
                      {m.name || 'Family member'}
                      {m.userId === myId && <span className="text-ink-muted"> (you)</span>}
                    </span>
                    {presence && (
                      <span className={`block ${comfort ? 'text-[1.25rem] font-semibold' : 'text-[1rem]'} ${on ? 'text-green' : 'text-ink-muted'}`}>
                        {on ? (comfort ? 'Online now' : 'Online') : 'Offline'}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="info-invite" className="mt-6">
          <h3 id="info-invite" className={`flex items-center gap-2 font-bold ${comfort ? 'text-[1.5rem]' : ''}`}>
            <LinkIcon /> Invite link
          </h3>
          <p className="mt-1 text-ink-muted">Anyone with this link can join {roomName}.</p>
          {invite ? (
            <>
              <p className={`mt-2 break-all rounded-xl border border-line bg-surface px-3 py-2 text-ink ${comfort ? 'text-[1.125rem]' : 'text-[1rem]'}`}>
                {invite}
              </p>
              <button
                type="button"
                onClick={copy}
                className={`mt-2 inline-flex ${comfort ? 'min-h-[64px] text-[1.25rem] font-bold' : 'min-h-[48px]'} w-full items-center justify-center gap-2 rounded-2xl bg-green px-4 font-semibold text-white hover:bg-[#173a2c]`}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied' : 'Copy invite link'}
              </button>
            </>
          ) : (
            <p className="mt-2 text-ink-muted">{inviteError ?? 'Loading…'}</p>
          )}
        </section>

        <section aria-labelledby="info-checkin" className="mt-6 rounded-2xl border-2 border-dashed border-line-strong p-4">
          <h3 id="info-checkin" className={`flex items-center gap-2 font-bold ${comfort ? 'text-[1.5rem]' : ''}`}>
            <HeartIcon /> Family check-in
          </h3>
          <p className="mt-1 text-ink-muted">Coming soon: one tap a day for “I’m fine”, and a gentle alert if someone misses it.</p>
        </section>
      </div>
    </aside>
  );
}
