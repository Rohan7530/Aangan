import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatHeader } from '../components/ChatHeader';
import { COMPOSER_INPUT_ID, Composer } from '../components/Composer';
import { MembersSheet } from '../components/MembersSheet';
import { senderLabel } from '../components/messageModel';
import { MessageList } from '../components/MessageList';
import { assignTones, ToneProvider } from '../components/tones';
import { ReaderSettingsSheet, useReaderPrefs, useSpeech } from '../features/reader-view';
import * as nexconn from '../nexconn/client';
import { getMemberCount, listMembers, onMembersChanged, type Member } from '../nexconn/group';
import { watchPresence, type PresenceMap } from '../nexconn/presence';
import { getReaders, markRead, onReadReceipts } from '../nexconn/receipts';
import type { ChatMessage, ConnectionState } from '../nexconn/types';
import type { Session } from '../session';

interface Props {
  session: Session;
  onLogout?: () => void;
  /** Showcase phone: no sign-out, no skip link. */
  embedded?: boolean;
}

// Nexconn status code: token is incorrect or expired. Nothing to do but log in again.
const CODE_BAD_TOKEN = 31004;
const READ_BATCH = 50;

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

function seenText(readerIds: Set<string>, others: number, nameOf: (id: string) => string): string | null {
  if (readerIds.size === 0) return null;
  if (others > 1 && readerIds.size >= others) return 'Seen by everyone';
  const names = [...readerIds].map(nameOf);
  if (names.length <= 3) return `Seen by ${names.join(', ')}`;
  return `Seen by ${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
}

export function ChatPage({ session, onLogout, embedded = false }: Props) {
  const { prefs } = useReaderPrefs();
  const speech = useSpeech();
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [presence, setPresence] = useState<PresenceMap | null>(null);
  const [readers, setReaders] = useState<Record<string, Set<string>>>({});
  const [announcement, setAnnouncement] = useState('');
  const [animateIds, setAnimateIds] = useState<ReadonlySet<string>>(() => new Set());
  const [readerOpen, setReaderOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const acked = useRef(new Set<string>());

  const { channelId, userId: myId } = session;
  const { stop: stopSpeech } = speech;
  const logout = useMemo(() => onLogout ?? (() => window.location.reload()), [onLogout]);

  // Switching to Standard hides Listen buttons, so stop any reading.
  useEffect(() => {
    if (prefs.mode === 'standard') stopSpeech();
  }, [prefs.mode, stopSpeech]);

  // ---- connect, listeners, history, members --------------------------------
  useEffect(() => {
    let cancelled = false;
    const markLive = (ids: string[]) =>
      setAnimateIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    const refreshMembers = () => {
      listMembers(channelId)
        .then((r) => {
          if (cancelled) return;
          if (r.ok) {
            setMembers(r.members);
            setMemberCount(r.members.length);
          } else {
            getMemberCount(channelId).then((n) => !cancelled && setMemberCount(n));
          }
        })
        .catch(() => undefined);
    };

    nexconn.initEngine({ appKey: session.appKey, areaCode: session.areaCode });

    // Listeners first (docs: register before connect), then connect, then history.
    const offStatus = nexconn.onConnectionState((state) => setConnection(state));
    const offMessages = nexconn.onTextMessage(channelId, (incoming) => {
      setMessages((prev) => mergeMessages(prev, incoming));
      markLive(incoming.map((m) => m.id));
      const fromOthers = incoming.filter((m) => m.senderId !== myId);
      const latest = fromOthers[fromOthers.length - 1];
      if (latest) setAnnouncement(`${senderLabel(latest)} says: ${latest.text}`);
    });
    const offMembers = onMembersChanged(channelId, refreshMembers);
    const offReceipts = onReadReceipts(channelId, (updates) => {
      setReaders((prev) => {
        const next = { ...prev };
        for (const u of updates) next[u.messageId] = new Set([...(next[u.messageId] ?? []), ...u.readerIds]);
        return next;
      });
    });
    setConnection(nexconn.getConnectionState());

    (async () => {
      const result = await nexconn.connect(session.token);
      if (cancelled) return;
      if (!result.ok) {
        if (result.code === CODE_BAD_TOKEN) {
          logout();
          return;
        }
        setFatal(`Could not connect (code ${result.code}). Please check your internet and try again.`);
        setLoadingHistory(false);
        return;
      }
      refreshMembers();
      try {
        const history = await nexconn.loadHistory(channelId, { pageSize: 50 });
        if (!cancelled) setMessages((prev) => mergeMessages(prev, history));
      } catch (err) {
        console.warn('[chat] history failed:', err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
      offStatus();
      offMessages();
      offMembers();
      offReceipts();
    };
  }, [session.appKey, session.areaCode, session.token, myId, channelId, logout]);

  // ---- presence (who is online) ----------------------------------------------
  const memberKey = members.map((m) => m.userId).sort().join(',');
  useEffect(() => {
    if (connection !== 'connected' || !memberKey) return;
    let stop = () => {};
    let cancelled = false;
    watchPresence(memberKey.split(','), (map) => !cancelled && setPresence(map))
      .then((w) => {
        stop = w.stop;
        if (!w.ok) {
          console.warn('[chat] presence unavailable, code', w.code);
          if (!cancelled) setPresence(null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop();
    };
  }, [memberKey, connection]);

  // ---- read receipts: tell senders we've seen their messages -------------------
  useEffect(() => {
    if (connection !== 'connected') return;
    const send = () => {
      if (document.visibilityState !== 'visible') return;
      const ids = messages
        .filter((m) => m.senderId !== myId && !acked.current.has(m.id))
        .slice(-READ_BATCH)
        .map((m) => m.id);
      if (ids.length === 0) return;
      ids.forEach((id) => acked.current.add(id));
      markRead(channelId, ids).catch(() => undefined);
    };
    const t = window.setTimeout(send, 400);
    document.addEventListener('visibilitychange', send);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', send);
    };
  }, [messages, connection, channelId, myId]);

  // ---- "Seen by ..." under my latest message -----------------------------------
  const myLast = useMemo(() => [...messages].reverse().find((m) => m.senderId === myId) ?? null, [messages, myId]);
  useEffect(() => {
    if (!myLast || connection !== 'connected') return;
    let cancelled = false;
    getReaders(channelId, myLast.id)
      .then((r) => {
        if (!cancelled && r.ok && r.readerIds.length) {
          setReaders((prev) => ({ ...prev, [myLast.id]: new Set([...(prev[myLast.id] ?? []), ...r.readerIds]) }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [myLast, channelId, connection]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of messages) if (m.senderName) map.set(m.senderId, m.senderName);
    for (const m of members) if (m.name) map.set(m.userId, m.name);
    return map;
  }, [messages, members]);

  const seenBy = useMemo(() => {
    if (!myLast) return null;
    const ids = new Set([...(readers[myLast.id] ?? [])].filter((id) => id !== myId));
    const others = Math.max(0, (memberCount ?? members.length) - 1);
    const text = seenText(ids, others, (id) => names.get(id) ?? 'Family member');
    return text ? { messageId: myLast.id, text } : null;
  }, [myLast, readers, myId, memberCount, members.length, names]);

  const tones = useMemo(
    () => assignTones([...members.map((m) => m.userId), ...messages.map((m) => m.senderId)]),
    // members define the order; message senders only fill gaps for people who left
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memberKey, messages.length],
  );
  const onlineCount = presence ? members.filter((m) => m.userId === myId || presence[m.userId]).length : null;

  const send = useCallback(
    async (text: string) => {
      const sent = await nexconn.sendTextWithReceipt(channelId, text, { userId: myId, name: session.name });
      setMessages((prev) => mergeMessages(prev, [sent]));
      setAnimateIds((prev) => new Set(prev).add(sent.id));
    },
    [channelId, myId, session.name],
  );

  async function signOut() {
    setReaderOpen(false);
    stopSpeech();
    await nexconn.disconnect().catch(() => undefined);
    logout();
  }

  return (
    <ToneProvider tones={tones}>
      <div className="reader-root flex min-h-0 flex-1 flex-col" data-reader-mode={prefs.mode} data-text-step={prefs.textStep}>
        {!embedded && (
          <a href={`#${COMPOSER_INPUT_ID}`} className="skip-link">
            Skip to message box
          </a>
        )}

        <ChatHeader
          channelName={session.channelName}
          memberCount={memberCount}
          onlineCount={onlineCount}
          connection={connection}
          onOpenMembers={() => setMembersOpen(true)}
          onOpenReader={() => setReaderOpen(true)}
        />

        {fatal ? (
          <p role="alert" className="border-b border-line bg-terracotta-soft px-4 py-3 font-semibold text-terracotta-deep">
            {fatal}
          </p>
        ) : (
          connection === 'offline' &&
          !loadingHistory && (
            <p className="border-b border-line bg-sand px-4 py-3 text-ink">You are offline. Aangan will reconnect by itself.</p>
          )
        )}

        <main className="flex min-h-0 flex-1 flex-col" aria-label={`${session.channelName} conversation`}>
          <MessageList
            messages={messages}
            myUserId={myId}
            mode={prefs.mode}
            loading={loadingHistory}
            animateIds={animateIds}
            speech={speech}
            seenBy={seenBy}
            onSuggest={(text) => setPrefill({ text, nonce: Date.now() })}
          />
          <Composer mode={prefs.mode} disabled={connection !== 'connected'} onSend={send} prefill={prefill} />
        </main>

        {/* Screen readers hear each new message from others once. */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>

        <ReaderSettingsSheet
          open={readerOpen}
          onClose={() => setReaderOpen(false)}
          onSignOut={embedded ? undefined : signOut}
          speech={speech}
          myName={session.name}
        />
        <MembersSheet
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          members={members}
          myUserId={myId}
          presence={presence}
        />
      </div>
    </ToneProvider>
  );
}
