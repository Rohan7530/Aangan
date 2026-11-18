import { useState } from 'react';
import type { Speech } from '../../features/reader-view';
import { useRoom } from '../../hooks/useRoom';
import type { RichMessage } from '../../nexconn/rich';
import type { RoomSummary } from '../../nexconn/rooms';
import type { ConnectionState } from '../../nexconn/types';
import type { Session } from '../../session';
import { ConnectionChip } from '../ConnectionChip';
import { RoomsIcon, TextSizeIcon } from '../icons';
import { Lightbox } from '../Lightbox';
import { MembersSheet } from '../MembersSheet';
import { MessageList } from '../MessageList';
import { PhotoSendSheet } from '../PhotoSendSheet';
import { ToneProvider } from '../tones';
import { ComfortComposer } from './ComfortComposer';
import { MyRoomsSheet } from './MyRoomsSheet';

interface Props {
  session: Session;
  channelId: string;
  roomName: string;
  rooms: RoomSummary[];
  onSelectRoom: (channelId: string) => void;
  connection: ConnectionState;
  fatal: string | null;
  speech: Speech;
  onOpenReader: () => void;
  onSent: (msg: RichMessage) => void;
}

// Comfort mode: one room at a time, large cards, every button labelled.
export function ComfortRoom(props: Props) {
  const { session, channelId, roomName, rooms, onSelectRoom, connection, fatal, speech, onOpenReader, onSent } = props;
  const room = useRoom(session, channelId, connection);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);

  const otherUnread = rooms.filter((r) => r.channelId !== channelId).reduce((n, r) => n + r.unread, 0);
  const membersLine = room.memberCount === null ? null : `${room.memberCount} ${room.memberCount === 1 ? 'member' : 'members'}`;

  return (
    <ToneProvider tones={room.tones}>
      <section aria-label={`${roomName} conversation`} className="flex min-w-0 flex-1 flex-col bg-cream">
        <a href="#composer-input" className="skip-link">
          Skip to message box
        </a>
        <header className="shrink-0 border-b border-line bg-cream px-4 py-3">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {/* Row 1: the room, given the full width. Tap for who's here. */}
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              aria-haspopup="dialog"
              className="w-full rounded-2xl px-2 py-1 text-left hover:bg-sand"
              style={{ minHeight: 56 }}
            >
              <span className="line-clamp-2 block font-bold leading-tight text-green" style={{ fontSize: 'var(--title-size)' }}>
                {roomName}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 text-[1.125rem] text-ink-muted">
                {membersLine && (
                  <span className="underline decoration-dotted underline-offset-4">
                    {membersLine}
                    {room.onlineCount ? `, ${room.onlineCount} online` : ''}
                  </span>
                )}
                <ConnectionChip state={connection} />
                <span className="sr-only">Show who is here</span>
              </span>
            </button>
            {/* Row 2: large labelled buttons. */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRoomsOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-green bg-surface px-4 text-[1.125rem] font-bold text-green hover:bg-green-soft"
              >
                <RoomsIcon />
                <span className="whitespace-nowrap">My rooms</span>
                {otherUnread > 0 && (
                  <span className="rounded-xl bg-terracotta px-2 text-white">
                    {otherUnread} new<span className="sr-only"> in other rooms</span>
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={onOpenReader}
                aria-haspopup="dialog"
                className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-green bg-surface px-4 text-[1.125rem] font-bold text-green hover:bg-green-soft"
              >
                <TextSizeIcon />
                <span className="whitespace-nowrap">How I read</span>
              </button>
            </div>
          </div>
        </header>

        {fatal ? (
          <p role="alert" className="border-b border-line bg-terracotta-soft px-4 py-3 font-semibold text-terracotta-deep">
            {fatal}
          </p>
        ) : (
          connection === 'offline' &&
          !room.loading && <p className="border-b border-line bg-sand px-4 py-3 text-ink">You are offline. Aangan will reconnect by itself.</p>
        )}

        <MessageList
          messages={room.messages}
          myUserId={session.userId}
          mode="comfort"
          loading={room.loading}
          animateIds={room.animateIds}
          speech={speech}
          seenBy={room.seenBy}
          myReactionKey={room.myReactionKey}
          onSuggest={(text) => setPrefill({ text, nonce: Date.now() })}
          onOpenImage={(url, alt) => setLightbox({ url, alt })}
        />
        <ComfortComposer
          disabled={connection !== 'connected'}
          onSend={async (text) => onSent(await room.sendText(text))}
          onPickPhoto={setPhoto}
          prefill={prefill}
        />
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {room.announcement}
        </div>
      </section>

      <MyRoomsSheet open={roomsOpen} onClose={() => setRoomsOpen(false)} rooms={rooms} activeId={channelId} myId={session.userId} onSelect={onSelectRoom} />
      <MembersSheet open={membersOpen} onClose={() => setMembersOpen(false)} members={room.members} myUserId={session.userId} presence={room.presence} />
      <PhotoSendSheet
        file={photo}
        onCancel={() => setPhoto(null)}
        onSend={async (file, onProgress) => {
          const sent = await room.sendPhoto(file, onProgress);
          setPhoto(null);
          onSent(sent);
        }}
      />
      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
    </ToneProvider>
  );
}
