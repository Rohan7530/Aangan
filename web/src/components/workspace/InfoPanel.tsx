import { useEffect, useRef, useState, type Ref } from 'react';
import { getRoomInvite, uploadRoomPhoto } from '../../api';
import { setRoomPhotos } from '../../features/settings/profileColors';
import { resizeToSquare } from '../../lib/resizeImage';
import type { Member } from '../../nexconn/group';
import type { PresenceMap } from '../../nexconn/presence';
import { setGroupPhoto } from '../../nexconn/profile';
import { Avatar } from '../Avatar';
import { CheckIcon, CloseIcon, CopyIcon, HeartIcon, LinkIcon, PhotoIcon } from '../icons';
import { RoomAvatar } from './RoomAvatar';

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
  /** Moves focus here when the panel is opened by the person. */
  closeRef?: Ref<HTMLButtonElement>;
  id?: string;
}

// The family: its photo (tap to change) and name, who is here (online dots),
// the invite link, and the reserved "Family check-in" section. One component
// for both modes; Comfort only changes the sizing.
export function InfoPanel({ channelId, roomName, members, presence, myId, authKey, onClose, fullWidth, size = 'standard', closeRef, id }: Props) {
  const comfort = size === 'comfort';
  const [invite, setInvite] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{ kind: 'ok' | 'error' | 'busy'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const online = (uid: string) => uid === myId || presence?.[uid] === true;
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

  // Family photo: the file on our server for everyone; also on the Nexconn group
  // when this person owns it (other members get 25405 from Nexconn).
  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoStatus({ kind: 'busy', text: 'Saving photo…' });
    try {
      const path = await uploadRoomPhoto(authKey, channelId, await resizeToSquare(file));
      setRoomPhotos({ [channelId]: path });
      void setGroupPhoto(channelId, new URL(path, window.location.origin).href);
      setPhotoStatus({ kind: 'ok', text: 'Family photo saved.' });
    } catch (err) {
      setPhotoStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save the photo.' });
    }
  }

  const h3 = comfort ? 'px-1 text-[1.5rem] font-bold' : 'px-1 text-[1rem] font-semibold uppercase tracking-wide text-ink-muted';

  return (
    <aside
      id={id}
      aria-label={`About ${roomName}`}
      className={`app-side panel-enter flex h-full shrink-0 flex-col border-l border-line bg-canvas ${comfort ? 'comfort-info' : ''} ${
        fullWidth ? 'w-full' : comfort ? 'w-[360px]' : 'w-[272px] xl:w-[300px]'
      }`}
    >
      {comfort ? (
        <header className="px-4 pt-4">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[64px] w-full items-center justify-center gap-2 rounded-full bg-surface text-[1.375rem] font-bold text-accent-ink shadow-[var(--shadow-1)] hover:bg-accent-soft"
          >
            <CloseIcon />
            <span>Close</span>
          </button>
        </header>
      ) : (
        <header className="flex items-center gap-2 px-3 pt-2">
          <h2 className="min-w-0 flex-1 truncate px-1 text-[1.125rem] font-semibold">Family info</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close family info"
            className="grid h-12 w-12 place-items-center rounded-full text-ink-muted hover:bg-fill hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto px-4 pb-6 ${comfort ? 'pt-4 text-[1.25rem]' : 'pt-2'}`}>
        {/* The family: photo (tap to change) + name */}
        <section className="flex flex-col items-center gap-2 pb-5 text-center">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void changePhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative rounded-[28px]"
            aria-label={`Change the photo of ${roomName}`}
            title="Change family photo"
          >
            <RoomAvatar id={channelId} name={roomName} size={comfort ? 112 : 96} />
            <span className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border-2 border-canvas bg-accent text-on-accent shadow-[var(--shadow-1)]">
              <PhotoIcon />
            </span>
          </button>
          <h2 className={`font-bold leading-tight ${comfort ? 'text-[1.75rem]' : 'text-[1.375rem]'}`}>{roomName}</h2>
          <p className="text-ink-muted">
            {members.length} {members.length === 1 ? 'member' : 'members'}
            {onlineCount !== null && `, ${onlineCount} online`}
          </p>
          <p role="status" className={`font-semibold empty:hidden ${photoStatus?.kind === 'error' ? 'text-danger' : 'text-ink-muted'}`}>
            {photoStatus?.text}
          </p>
        </section>

        <section aria-labelledby="info-members">
          <h3 id="info-members" className={h3}>
            Members <span className="font-semibold normal-case tracking-normal">· {members.length}{onlineCount !== null && `, ${onlineCount} online`}</span>
          </h3>
          <ul className="group-card mt-2 overflow-hidden">
            {sorted.map((m) => {
              const on = online(m.userId);
              return (
                <li key={m.userId} className={`flex items-center gap-3 border-b border-line px-3 last:border-b-0 ${comfort ? 'min-h-[76px]' : 'min-h-[56px]'}`}>
                  <span className="relative">
                    <Avatar id={m.userId} name={m.name || '?'} size={comfort ? 52 : 40} mine={m.userId === myId} />
                    {presence && <span aria-hidden="true" className={`status-dot !border-surface ${comfort ? '!h-[18px] !w-[18px]' : ''} ${on ? 'bg-success' : 'bg-line-strong'}`} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${comfort ? 'text-[1.375rem] font-bold' : 'font-semibold'}`}>
                      {m.name || 'Family member'}
                      {m.userId === myId && <span className="font-normal text-ink-muted"> (you)</span>}
                    </span>
                    {presence && (
                      <span className={`block ${comfort ? 'text-[1.25rem] font-semibold' : 'text-[1rem]'} ${on ? 'text-success-ink' : 'text-ink-muted'}`}>
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
          <h3 id="info-invite" className={`flex items-center gap-2 ${h3}`}>
            <LinkIcon /> Invite link
          </h3>
          <div className="group-card mt-2 p-4">
            <p className="text-ink-muted">Anyone with this link can join {roomName}.</p>
            {invite ? (
              <>
                <p className={`mt-2 break-all rounded-[10px] bg-canvas px-3 py-2 text-ink ${comfort ? 'text-[1.125rem]' : 'text-[1rem]'}`}>{invite}</p>
                <button
                  type="button"
                  onClick={copy}
                  className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-on-accent hover:bg-accent-deep ${
                    comfort ? 'min-h-[64px] text-[1.25rem] font-bold' : 'min-h-[48px] font-semibold'
                  }`}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? 'Copied' : 'Copy invite link'}
                </button>
              </>
            ) : (
              <p className="mt-2 text-ink-muted">{inviteError ?? 'Loading…'}</p>
            )}
          </div>
        </section>

        <section aria-labelledby="info-checkin" className="mt-6">
          <h3 id="info-checkin" className={`flex items-center gap-2 ${h3}`}>
            <HeartIcon /> Family check-in
          </h3>
          <div className="group-card mt-2 p-4">
            <p className="text-ink-muted">Coming soon: one tap a day for “I’m fine”, and a gentle alert if someone misses it.</p>
          </div>
        </section>
      </div>
    </aside>
  );
}
