import { useState } from 'react';
import { speechLang, useReaderPrefs, useTranslations, type Speech } from '../../features/reader-view';
import { useRoom } from '../../hooks/useRoom';
import type { RichMessage } from '../../nexconn/rich';
import type { ConnectionState } from '../../nexconn/types';
import type { Session } from '../../session';
import { ConnectionChip } from '../ConnectionChip';
import { BackIcon, TextSizeIcon } from '../icons';
import { Lightbox } from '../Lightbox';
import { MembersSheet } from '../MembersSheet';
import { MessageList } from '../MessageList';
import { PhotoSendSheet } from '../PhotoSendSheet';
import { ToneProvider } from '../tones';
import { RoomAvatar } from '../workspace/RoomAvatar';
import { ComfortComposer } from './ComfortComposer';

interface Props {
  session: Session;
  channelId: string;
  roomName: string;
  connection: ConnectionState;
  fatal: string | null;
  speech: Speech;
  onOpenReader: () => void;
  onSent: (msg: RichMessage) => void;
  /** Phones: back to the room list (a large labelled button). */
  onBack?: () => void;
  /** Unread messages in other rooms, shown on the back button. */
  otherUnread?: number;
}

// Comfort mode chat pane: large cards, every button labelled with text.
export function ComfortRoom(props: Props) {
  const { session, channelId, roomName, connection, fatal, speech, onOpenReader, onSent, onBack, otherUnread = 0 } = props;
  const room = useRoom(session, channelId, connection);
  const { prefs } = useReaderPrefs();
  const translations = useTranslations(room.messages, session.userId, prefs.language, session.authKey);
  const [membersOpen, setMembersOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);

  const membersLine = room.memberCount === null ? null : `${room.memberCount} ${room.memberCount === 1 ? 'member' : 'members'}`;
  const bigButton =
    'inline-flex min-h-[56px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-green bg-surface px-4 text-[1.125rem] font-bold text-green hover:bg-green-soft';

  return (
    <ToneProvider tones={room.tones}>
      <section aria-label={`${roomName} conversation`} className="flex min-w-0 flex-1 flex-col bg-cream">
        <a href="#composer-input" className="skip-link">
          Skip to message box
        </a>
        <header className="shrink-0 border-b-2 border-line bg-cream px-4 py-3">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            {onBack && (
              <button type="button" onClick={onBack} className={bigButton}>
                <BackIcon />
                <span className="whitespace-nowrap">My rooms</span>
                {otherUnread > 0 && (
                  <span className="rounded-xl bg-terracotta px-2 text-white">
                    {otherUnread} new<span className="sr-only"> in other rooms</span>
                  </span>
                )}
              </button>
            )}
            {/* The room: tap to see who is here. Takes its own full row on phones. */}
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              aria-haspopup="dialog"
              className={`flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1 text-left hover:bg-sand ${onBack ? 'order-last w-full' : 'flex-1'}`}
              style={{ minHeight: 64 }}
            >
              <RoomAvatar id={channelId} name={roomName} size={56} />
              <span className="min-w-0">
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
              </span>
            </button>
            <button type="button" onClick={onOpenReader} aria-haspopup="dialog" className={`${bigButton} ${onBack ? 'ml-auto' : ''}`}>
              <TextSizeIcon />
              <span className="whitespace-nowrap">How I read</span>
            </button>
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
          translations={translations}
          readerLang={prefs.language}
          onSuggest={(text) => setPrefill({ text, nonce: Date.now() })}
          onOpenImage={(url, alt) => setLightbox({ url, alt })}
        />
        <ComfortComposer
            speechLang={speechLang(prefs.language)}
            onSendVoice={async (transcript, audio) => onSent(await room.sendVoiceReply(transcript, audio, speechLang(prefs.language)))}
          disabled={connection !== 'connected'}
          onSend={async (text) => onSent(await room.sendText(text))}
          onPickPhoto={setPhoto}
          prefill={prefill}
        />
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {room.announcement}
        </div>
      </section>

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
