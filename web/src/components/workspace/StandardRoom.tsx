import { useLayoutEffect, useRef, useState } from 'react';
import { speechLang, useReaderPrefs, useTranslations, type Speech } from '../../features/reader-view';
import { useRoom } from '../../hooks/useRoom';
import type { ShieldVerdict } from '../../api';
import { AskFamilySheet, useShield } from '../../features/scam-shield';
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
  const { prefs } = useReaderPrefs();
  const translations = useTranslations(room.messages, session.userId, prefs.language, session.authKey);
  const shields = useShield(room.messages, session.userId, prefs.language, session.authKey);
  const [asking, setAsking] = useState<{ text: string; verdict: ShieldVerdict | null } | null>(null);
  const [replyTo, setReplyTo] = useState<RichMessage | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);

  const showInfoOnly = narrow && infoOpen;

  // The header and composer float over the message list (frosted glass), so the
  // list is padded by their measured heights and stays pinned to the newest
  // message when the composer grows.
  const sectionRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!section || !top || !bottom) return;
    const apply = () => {
      const scroller = section.querySelector<HTMLElement>('.chat-scroll');
      const atBottom = scroller ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 24 : false;
      section.style.setProperty('--chat-top', `${top.offsetHeight}px`);
      section.style.setProperty('--chat-bottom', `${bottom.offsetHeight}px`);
      if (scroller && atBottom) scroller.scrollTop = scroller.scrollHeight;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(top);
    ro.observe(bottom);
    return () => ro.disconnect();
  }, [showInfoOnly]);
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
        <section ref={sectionRef} aria-label={`${roomName} conversation`} className="chat-stage room-enter relative flex min-w-0 flex-1 flex-col bg-chat">
          <a href={`#${COMPOSER_INPUT_ID}`} className="skip-link">
            Skip to message box
          </a>
          <div ref={topRef} className="chat-glass chat-glass-top">
            <header className="flex shrink-0 items-center gap-2 px-3 py-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to rooms"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-accent-ink hover:bg-fill"
                >
                  <BackIcon />
                </button>
              )}
              <RoomAvatar id={channelId} name={roomName} size={40} />
              <div className="min-w-0 flex-1 px-1">
                <h1 className="font-display truncate text-[1.1875rem] font-semibold leading-tight">{roomName}</h1>
                <p className="flex flex-wrap items-center gap-x-2 text-[1rem] leading-snug text-ink-muted">
                  {membersLine && (
                    <span className="whitespace-nowrap">
                      {membersLine}
                      {room.onlineCount !== null && `, ${room.onlineCount} online`}
                    </span>
                  )}
                  {/* Connection is shown in the profile row; here only when it is not connected. */}
                  <span className={connection === 'connected' ? 'sr-only' : 'whitespace-nowrap'}>
                    <ConnectionChip state={connection} />
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenReader}
                aria-haspopup="dialog"
                className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-full px-3 font-semibold text-accent-ink hover:bg-accent-soft"
              >
                <TextSizeIcon />
                <span className={narrow ? 'sr-only' : ''}>How I read</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleInfo(!infoOpen)}
                aria-pressed={infoOpen}
                aria-label="Family info"
                title="Family info"
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${infoOpen ? 'bg-accent-soft text-accent-ink' : 'text-accent-ink hover:bg-fill'}`}
              >
                <InfoIcon />
              </button>
            </header>

            {fatal ? (
              <p role="alert" className="border-b border-line bg-danger-soft px-4 py-3 font-semibold text-danger">
                {fatal}
              </p>
            ) : (
              connection === 'offline' &&
              !room.loading && <p className="border-b border-line bg-fill px-4 py-3 text-ink">You are offline. Aangan will reconnect by itself.</p>
            )}
          </div>

          <MessageList
            messages={room.messages}
            myUserId={session.userId}
            mode="standard"
            loading={room.loading}
            animateIds={room.animateIds}
            speech={speech}
            seenBy={room.seenBy}
            myReactionKey={room.myReactionKey}
            translations={translations}
            readerLang={prefs.language}
            onSuggest={(text) => setPrefill({ text, nonce: Date.now() })}
            onReply={setReplyTo}
            onReact={(id, emoji) => void room.toggleReaction(id, emoji)}
            onOpenImage={(url, alt) => setLightbox({ url, alt })}
            shields={shields}
            onAskFamily={(msg, verdict) => setAsking({ text: msg.text, verdict })}
          />
          <div ref={bottomRef} className="chat-glass chat-glass-bottom">
            <StandardComposer
              speechLang={speechLang(prefs.language)}
              onSendVoice={async (transcript, audio) => onSent(await room.sendVoiceReply(transcript, audio, speechLang(prefs.language)))}
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
          </div>
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
      <AskFamilySheet
        target={asking}
        onClose={() => setAsking(null)}
        me={{ userId: session.userId, authKey: session.authKey }}
        lang={prefs.language}
        members={room.members}
      />
    </ToneProvider>
  );
}
