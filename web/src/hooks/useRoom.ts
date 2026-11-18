import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { senderLabel } from '../components/messageModel';
import { assignTones } from '../components/tones';
import { getColors } from '../api';
import { setProfileColors } from '../features/settings/profileColors';
import { getMemberCount, listMembers, onMembersChanged, type Member } from '../nexconn/group';
import { watchPresence, type PresenceMap } from '../nexconn/presence';
import { getReaders, markRead, onReadReceipts } from '../nexconn/receipts';
import {
  loadRichHistory,
  onReactionChanges,
  onRichMessages,
  reactionKey,
  sendImage,
  sendRichText,
  sendSpokenText,
  sendVoice,
  setMyReactions,
  type RichMessage,
} from '../nexconn/rich';
import type { ConnectionState } from '../nexconn/types';
import type { Session } from '../session';

const READ_BATCH = 50;

// Two members with the same name (e.g. someone who signed in twice on different
// devices) get a short suffix from their user ID so they can be told apart.
export function distinctNames(members: Member[]): Member[] {
  const norm = (n: string) => n.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const m of members) if (m.name) counts.set(norm(m.name), (counts.get(norm(m.name)) ?? 0) + 1);
  return members.map((m) => (m.name && (counts.get(norm(m.name)) ?? 0) > 1 ? { ...m, name: `${m.name} ·${m.userId.slice(-4)}` } : m));
}

function merge(current: RichMessage[], incoming: RichMessage[]): RichMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, { ...byId.get(m.id), ...m });
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

function seenText(readerIds: Set<string>, others: number, nameOf: (id: string) => string): string | null {
  if (readerIds.size === 0) return null;
  if (others > 1 && readerIds.size >= others) return 'Seen by everyone';
  const names = [...readerIds].map(nameOf);
  if (names.length <= 3) return `Seen by ${names.join(', ')}`;
  return `Seen by ${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
}

// Everything about one open room. Mount with key={channelId}.
export function useRoom(session: Session, channelId: string, connection: ConnectionState) {
  const myId = session.userId;
  const [messages, setMessages] = useState<RichMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [presence, setPresence] = useState<PresenceMap | null>(null);
  const [readers, setReaders] = useState<Record<string, Set<string>>>({});
  const [announcement, setAnnouncement] = useState('');
  const [animateIds, setAnimateIds] = useState<ReadonlySet<string>>(() => new Set());
  const acked = useRef(new Set<string>());
  const connected = connection === 'connected';

  const markLive = (ids: string[]) =>
    setAnimateIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

  // ---- live listeners (registered before history so nothing is missed) -------
  useEffect(() => {
    const offMsgs = onRichMessages((all) => {
      const mine = all.filter((m) => m.channelId === channelId);
      if (!mine.length) return;
      setMessages((prev) => merge(prev, mine));
      markLive(mine.map((m) => m.id));
      const fromOthers = mine.filter((m) => m.senderId !== myId);
      const latest = fromOthers[fromOthers.length - 1];
      if (latest) setAnnouncement(`${senderLabel(latest)} ${latest.kind === 'image' ? 'sent a photo' : `says: ${latest.text}`}`);
    });
    const offReactions = onReactionChanges((c) => {
      if (c.channelId !== channelId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== c.messageId) return m;
          const reactions = { ...m.reactions, ...c.set };
          for (const k of c.removed) delete reactions[k];
          return { ...m, reactions };
        }),
      );
    });
    const offReceipts = onReadReceipts(channelId, (updates) =>
      setReaders((prev) => {
        const next = { ...prev };
        for (const u of updates) next[u.messageId] = new Set([...(next[u.messageId] ?? []), ...u.readerIds]);
        return next;
      }),
    );
    return () => {
      offMsgs();
      offReactions();
      offReceipts();
    };
  }, [channelId, myId]);

  // ---- history + members once connected -------------------------------------------
  const refreshMembers = useCallback(() => {
    listMembers(channelId)
      .then((r) => {
        if (r.ok) {
          setMembers(distinctNames(r.members));
          setMemberCount(r.members.length);
        } else {
          getMemberCount(channelId).then(setMemberCount);
        }
      })
      .catch(() => undefined);
  }, [channelId]);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    refreshMembers();
    const offMembers = onMembersChanged(channelId, refreshMembers);
    loadRichHistory(channelId, { pageSize: 50 })
      .then((h) => !cancelled && setMessages((prev) => merge(prev, h)))
      .catch((err) => console.warn('[room] history failed:', err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      offMembers();
    };
  }, [channelId, connected, refreshMembers]);

  // ---- presence -----------------------------------------------------------------
  const memberKey = members.map((m) => m.userId).sort().join(',');

  // ---- avatar colours members picked in Settings ------------------------------
  useEffect(() => {
    if (!memberKey) return;
    getColors(session.authKey, memberKey.split(',')).then(setProfileColors).catch(() => undefined);
  }, [memberKey, session.authKey]);
  useEffect(() => {
    if (!connected || !memberKey) return;
    let stop = () => {};
    let cancelled = false;
    watchPresence(memberKey.split(','), (map) => !cancelled && setPresence(map))
      .then((w) => {
        stop = w.stop;
        if (!w.ok && !cancelled) setPresence(null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop();
    };
  }, [memberKey, connected]);

  // ---- read receipts: tell senders we've seen their messages ---------------------
  useEffect(() => {
    if (!connected) return;
    const send = () => {
      if (document.visibilityState !== 'visible') return;
      const ids = messages
        .filter((m) => m.senderId !== myId && !acked.current.has(m.id))
        .slice(-READ_BATCH)
        .map((m) => m.id);
      if (!ids.length) return;
      ids.forEach((id) => acked.current.add(id));
      markRead(channelId, ids).catch(() => undefined);
    };
    const t = window.setTimeout(send, 400);
    document.addEventListener('visibilitychange', send);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', send);
    };
  }, [messages, connected, channelId, myId]);

  // ---- "Seen by ..." under my latest message ---------------------------------------
  const myLast = useMemo(() => [...messages].reverse().find((m) => m.senderId === myId) ?? null, [messages, myId]);
  useEffect(() => {
    if (!myLast || !connected) return;
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
  }, [myLast, channelId, connected]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of messages) if (m.senderName) map.set(m.senderId, m.senderName);
    for (const m of members) if (m.name) map.set(m.userId, m.name);
    return map;
  }, [messages, members]);

  const seenBy = useMemo(() => {
    if (!myLast) return null;
    const ids = new Set([...(readers[myLast.id] ?? [])].filter((id) => id !== myId));
    const text = seenText(ids, Math.max(0, (memberCount ?? members.length) - 1), (id) => names.get(id) ?? 'Family member');
    return text ? { messageId: myLast.id, text } : null;
  }, [myLast, readers, myId, memberCount, members.length, names]);

  const tones = useMemo(
    () => assignTones([...members.map((m) => m.userId), ...messages.map((m) => m.senderId)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memberKey, messages.length],
  );
  const onlineCount = presence ? members.filter((m) => m.userId === myId || presence[m.userId]).length : null;

  // ---- actions --------------------------------------------------------------------
  const me = useMemo(() => ({ userId: myId, name: session.name }), [myId, session.name]);

  const addSent = (sent: RichMessage) => {
    setMessages((prev) => merge(prev, [sent]));
    markLive([sent.id]);
    return sent;
  };

  const sendText = useCallback(
    async (text: string, replyTo?: RichMessage | null) => addSent(await sendRichText(channelId, text, me, replyTo)),
    [channelId, me],
  );

  const sendPhoto = useCallback(
    async (file: File, onProgress?: (p: number) => void) => addSent(await sendImage(channelId, file, me, onProgress)),
    [channelId, me],
  );

  // Voice reply: a Nexconn voice message with its transcript, or (no audio) the
  // transcript as text marked "spoken".
  const sendVoiceReply = useCallback(
    async (transcript: string, audio: File | null, lang: string) =>
      addSent(audio ? await sendVoice(channelId, audio, transcript, lang, me) : await sendSpokenText(channelId, transcript, me)),
    [channelId, me],
  );

  const myKey = reactionKey(myId);
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;
      const current = msg.reactions[myKey] ?? [];
      const next = current.includes(emoji) ? current.filter((e) => e !== emoji) : [...current, emoji];
      const apply = (list: string[]) =>
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = { ...m.reactions };
            if (list.length) reactions[myKey] = list;
            else delete reactions[myKey];
            return { ...m, reactions };
          }),
        );
      apply(next); // optimistic
      try {
        await setMyReactions(channelId, messageId, myId, next);
      } catch (err) {
        console.warn('[room] reaction failed:', err);
        apply(current);
      }
    },
    [messages, myKey, channelId, myId],
  );

  // Fill in names the message itself does not carry, from the member list.
  const named = useMemo(
    () =>
      messages.map((m) => {
        const senderName = names.get(m.senderId) || m.senderName;
        const reply = m.reply && !m.reply.senderName ? { ...m.reply, senderName: names.get(m.reply.senderId) } : m.reply;
        return senderName === m.senderName && reply === m.reply ? m : { ...m, senderName, reply };
      }),
    [messages, names],
  );

  return {
    messages: named,
    loading,
    members,
    memberCount,
    presence,
    onlineCount,
    seenBy,
    tones,
    announcement,
    animateIds,
    myReactionKey: myKey,
    sendText,
    sendPhoto,
    sendVoiceReply,
    toggleReaction,
  };
}

export type RoomModel = ReturnType<typeof useRoom>;
