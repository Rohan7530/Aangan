import { useState } from 'react';
import type { Speech } from '../../features/reader-view';
import { useRoom } from '../../hooks/useRoom';
import type { RichMessage } from '../../nexconn/rich';
import type { ConnectionState } from '../../nexconn/types';
import type { Session } from '../../session';
import { ConnectionChip } from '../ConnectionChip';
import { BackIcon, InfoIcon, TextSizeIcon } from '../icons';
import { Lightbox } from '../Lightbox';
import { MessageList } from '../MessageList';
import { PhotoSendSheet } from '../PhotoSendSheet';
import { COMPOSER_INPUT_ID, StandardComposer } from '../StandardComposer';
import { ToneProvider } from '../tones';
import { InfoPanel } from './InfoPanel';
import { RoomAvatar } from './RoomAvatar';

interface Props {
  session: Session;
  channelId: string;
  roomName: string;
  connection: ConnectionState;
  fatal: string | null;
  speech: Speech;
  infoOpen: boolean;
  onToggleInfo: (open: boolean) => void;
  onOpenReader: () => void;
  onSent: (msg: RichMessage) => void;
  /** Narrow screens: one pane at a time, with a back button to the room list. */
  narrow: boolean;
  onBack?: () => void;
}

// One open room in Standard mode: [ chat | info panel ].
export function StandardRoom(props: Props) {
  const { session, channelId, roomName, connection, fatal, speech, infoOpen, onToggleInfo, onOpenReader, onSent, narrow, onBack } = props;
  const room = useRoom(session, channelId, connection);
  const [replyTo, setReplyTo] = useState<RichMessage | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);

  const showInfoOnly = narrow && infoOpen;
  const membersLine = room.memberCount === null ? null : `${room.memberCount} ${room.memberCount === 1 ? 'member' : 'members'}`;

  const info = (
    <InfoPanel
      channelId={channelId}
      roomName={roomName}
      members={room.members}
      presence={room.presence}
      myId={session.userId}
      authKey={session.authKey}
      onClose={() => onToggleInfo(false)}
      fullWidth={narrow}
    />
  );

  return (
    <ToneProvider tones={room.tones}>
      {!showInfoOnly && (
        <section aria-label={`${roomName} conversation`} className="flex min-w-0 flex-1 flex-col bg-cream">
          <a href={`#${COMPOSER_INPUT_ID}`} className="skip-link">
            Skip to message box
          </a>
          <header className="flex shrink-0 items-center gap-2 border-b border-line bg-cream px-3 py-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to rooms"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink hover:bg-sand"
              >
                <BackIcon />
              </button>
            )}
            <RoomAvatar id={channelId} name={roomName} size={40} />
            <div className="min-w-0 flex-1 px-1">
              <h1 className="truncate text-[1.25rem] font-bold leading-tight text-green">{roomName}</h1>
              <p className="flex flex-wrap items-center gap-x-2 text-[1rem] leading-snug text-ink-muted">
                {membersLine && <span className="whitespace-nowrap">{membersLine}</span>}
                {room.onlineCount !== null && <span className="whitespace-nowrap">· {room.onlineCount} online</span>}
                <span className="whitespace-nowrap">
                  <ConnectionChip state={connection} />
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenReader}
              aria-haspopup="dialog"
              className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-2xl border-2 border-green bg-surface px-3 font-semibold text-green hover:bg-green-soft"
            >
              <TextSizeIcon />
              <span className={narrow ? 'sr-only' : ''}>How I read</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleInfo(!infoOpen)}
              aria-pressed={infoOpen}
              aria-label="Room info"
              title="Room info"
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${infoOpen ? 'bg-green-soft text-green' : 'text-ink-muted hover:bg-sand hover:text-ink'}`}
            >
              <InfoIcon />
            </button>
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
            mode="standard"
            loading={room.loading}
            animateIds={room.animateIds}
            speech={speech}
            seenBy={room.seenBy}
            myReactionKey={room.myReactionKey}
            onSuggest={(text) => setPrefill({ text, nonce: Date.now() })}
            onReply={setReplyTo}
            onReact={(id, emoji) => void room.toggleReaction(id, emoji)}
            onOpenImage={(url, alt) => setLightbox({ url, alt })}
          />
          <StandardComposer
            disabled={connection !== 'connected'}
            onSend={async (text) => {
              const sent = await room.sendText(text, replyTo);
              setReplyTo(null);
              onSent(sent);
            }}
            onPickPhoto={setPhoto}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            prefill={prefill}
          />
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {room.announcement}
          </div>
        </section>
      )}

      {infoOpen && info}

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
