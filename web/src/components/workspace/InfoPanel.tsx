import { useEffect, useState } from 'react';
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
}

// Room info: who is here (with online dots), the invite link, and a reserved
// "Family check-in" section for the next feature.
export function InfoPanel({ channelId, roomName, members, presence, myId, authKey, onClose, fullWidth }: Props) {
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
      aria-label={`About ${roomName}`}
      className={`flex h-full shrink-0 flex-col border-l border-line bg-cream ${fullWidth ? 'w-full' : 'w-[272px] xl:w-[300px]'}`}
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-[1.25rem] font-bold text-green">Room info</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close room info"
          className="grid h-12 w-12 place-items-center rounded-2xl text-ink-muted hover:bg-sand hover:text-ink"
        >
          <CloseIcon />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section aria-labelledby="info-members">
          <h3 id="info-members" className="font-bold">
            Members <span className="font-semibold text-ink-muted">· {members.length}{onlineCount !== null && `, ${onlineCount} online`}</span>
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {sorted.map((m) => {
              const on = online(m.userId);
              return (
                <li key={m.userId} className="flex min-h-[52px] items-center gap-3 rounded-2xl px-2">
                  <span className="relative">
                    <Avatar id={m.userId} name={m.name || '?'} size={40} mine={m.userId === myId} />
                    {presence && (
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-cream ${on ? 'bg-green' : 'bg-line-strong'}`}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {m.name || 'Family member'}
                      {m.userId === myId && <span className="text-ink-muted"> (you)</span>}
                    </span>
                    {presence && <span className={`block text-[1rem] ${on ? 'text-green' : 'text-ink-muted'}`}>{on ? 'Online' : 'Offline'}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="info-invite" className="mt-6">
          <h3 id="info-invite" className="flex items-center gap-2 font-bold">
            <LinkIcon /> Invite link
          </h3>
          <p className="mt-1 text-ink-muted">Anyone with this link can join {roomName}.</p>
          {invite ? (
            <>
              <p className="mt-2 break-all rounded-xl border border-line bg-surface px-3 py-2 text-[1rem] text-ink">{invite}</p>
              <button
                type="button"
                onClick={copy}
                className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-green px-4 font-semibold text-white hover:bg-[#173a2c]"
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
          <h3 id="info-checkin" className="flex items-center gap-2 font-bold">
            <HeartIcon /> Family check-in
          </h3>
          <p className="mt-1 text-ink-muted">Coming soon: one tap a day for “I’m fine”, and a gentle alert if someone misses it.</p>
        </section>
      </div>
    </aside>
  );
}
