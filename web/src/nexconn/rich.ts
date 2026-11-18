// Rich messages: text, photo, reply, and emoji reactions. Part of the Nexconn
// layer (only web/src/nexconn/ imports the SDK). Everything here was checked
// against the docs and then verified live before the UI used it:
//   - photo:    Helper.createSendImageMessageParams(file) + channel.sendMediaMessage  (/chatsdk-web/message/send.md)
//   - reply:    SendReferenceMessageParams { text, referMsgId, referMsgType, referMsgSenderId, referMsg }
//   - reaction: message metadata (expansion) — Message.setMetadata / deleteMetadata,
//               MessageHandler.onMessageMetadataUpdated / Deleted  (/platform-chat-api/message/expansion-about.md:
//               "supported for direct, group and system channels")
//   - history:  BaseChannel.createMessagesQuery; fetch by id: BaseChannel.getMessagesByIds
//   - voice:    Helper.createSendHDVoiceMessageParams(file) + sendMediaMessage (RC:HQVCMsg, max 60 s);
//               the speech-to-text transcript travels in the message content's `extra` (verified live)

import {
  BaseChannel,
  ChannelType,
  GroupChannel,
  Helper,
  MessageHandler,
  MessageType,
  NCEngine,
  SendReferenceMessageParams,
  SendTextMessageParams,
  type HDVoiceMessageContent,
  type ImageMessageContent,
  type Message,
  type ReferenceMessageContent,
  type TextMessageContent,
} from '@nexconn/chat';
import type { ChatMessage, Sender } from './types';

export type RichKind = 'text' | 'image' | 'reply' | 'voice';

export interface RichMessage extends ChatMessage {
  kind: RichKind;
  /** Photo: full-size URL on the Nexconn file server. */
  imageUrl?: string;
  /** Photo: small inline preview (data URL) shown while the full image loads. */
  thumbnail?: string;
  /** Reply: the quoted message. */
  reply?: { messageId: string; senderId: string; senderName?: string; text: string };
  /** Voice: audio URL and length in seconds. `text` holds the transcript. */
  audioUrl?: string;
  duration?: number;
  /** Text that was spoken rather than typed (voice transcript, or spoken-text fallback). */
  spoken?: boolean;
  /** Reactions: metadata key (one per member) -> emojis that member chose. */
  reactions: Record<string, string[]>;
}

// ---- reactions encoding --------------------------------------------------------
// One metadata key per member ("r_<userId>", value = their emojis joined by ","),
// so two people reacting at the same moment never overwrite each other.
const REACTION_PREFIX = 'r_';
export function reactionKey(userId: string): string {
  return `${REACTION_PREFIX}${userId}`.slice(0, 32); // metadata keys are limited to 32 chars
}
function reactionsFrom(entries: Iterable<[string, string]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of entries) {
    if (k.startsWith(REACTION_PREFIX) && v) out[k] = v.split(',').filter(Boolean);
  }
  return out;
}

// ---- mapping ---------------------------------------------------------------------
const cache = new Map<string, Message>(); // messageId -> SDK message (needed for setMetadata)

function asDataUrl(base64?: string): string | undefined {
  if (!base64) return undefined;
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

function readExtra(extra: unknown): { transcript?: string; spoken?: boolean; lang?: string } {
  if (typeof extra !== 'string' || !extra) return {};
  try {
    return JSON.parse(extra) as { transcript?: string; spoken?: boolean; lang?: string };
  } catch {
    return {};
  }
}

function quotedText(type: string, content: Record<string, unknown> | undefined): string {
  if (!content) return '';
  if (type === MessageType.IMAGE) return 'Photo';
  if (type === MessageType.HD_VOICE) return readExtra(content.extra).transcript || 'Voice message';
  return String(content.text ?? content.content ?? '');
}

export function toRich(msg: Message): RichMessage | null {
  const base = {
    id: msg.messageId,
    channelId: msg.channelIdentifier.channelId,
    senderId: msg.senderUserId,
    sentAt: msg.sentTime,
    reactions: reactionsFrom(msg.metadata ?? []),
  };
  if (msg.messageType === MessageType.TEXT) {
    const c = msg.content as TextMessageContent & { extra?: string };
    cache.set(msg.messageId, msg);
    return { ...base, kind: 'text', text: c.text, senderName: c.senderUserInfo?.name, spoken: readExtra(c.extra).spoken === true };
  }
  if (msg.messageType === MessageType.HD_VOICE) {
    const c = msg.content as HDVoiceMessageContent & { extra?: string };
    cache.set(msg.messageId, msg);
    return {
      ...base,
      kind: 'voice',
      text: readExtra(c.extra).transcript ?? '',
      senderName: c.senderUserInfo?.name,
      audioUrl: c.remoteUrl,
      duration: c.duration,
      spoken: true,
    };
  }
  if (msg.messageType === MessageType.IMAGE) {
    const c = msg.content as ImageMessageContent;
    cache.set(msg.messageId, msg);
    return {
      ...base,
      kind: 'image',
      text: '',
      senderName: c.senderUserInfo?.name,
      imageUrl: c.remoteUrl,
      thumbnail: asDataUrl(c.thumbnailBase64),
    };
  }
  if (msg.messageType === MessageType.REFERENCE) {
    const c = msg.content as ReferenceMessageContent & { referMsg?: Record<string, unknown> };
    const refUser = (c.referMsg?.senderUserInfo ?? undefined) as { name?: string } | undefined;
    cache.set(msg.messageId, msg);
    return {
      ...base,
      kind: 'reply',
      text: c.text,
      senderName: c.senderUserInfo?.name,
      reply: {
        messageId: c.referMsgId,
        senderId: c.referMsgSenderId,
        senderName: refUser?.name,
        text: quotedText(c.referMsgType, c.referMsg),
      },
    };
  }
  return null; // other types are not shown yet
}

function isGroup(msg: Message): boolean {
  return msg.channelIdentifier.channelType === ChannelType.GROUP;
}

async function sdkMessage(channelId: string, messageId: string): Promise<Message | null> {
  const hit = cache.get(messageId);
  if (hit) return hit;
  const res = await BaseChannel.getMessagesByIds({
    channelIdentifier: new GroupChannel(channelId).identifier,
    messageIds: [messageId],
  });
  const m = res.data?.[messageId];
  if (m) cache.set(messageId, m);
  return m ?? null;
}

// ---- history + live ----------------------------------------------------------------

// Oldest-first page of history. Web has no local store: always from the server.
export async function loadRichHistory(channelId: string, opts: { pageSize?: number; before?: number } = {}): Promise<RichMessage[]> {
  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: new GroupChannel(channelId).identifier,
    startTime: opts.before ?? Date.now(),
    pageSize: Math.min(Math.max(opts.pageSize ?? 50, 1), 100),
    isAscending: false,
  });
  const res = await query.loadNextPage();
  if (!res.isOk) throw new Error(`History failed (code ${res.code})`);
  return (res.data?.data ?? [])
    .map(toRich)
    .filter((m): m is RichMessage => m !== null)
    .sort((a, b) => a.sentAt - b.sentAt);
}

let seq = 0;

// New messages in ANY group channel (room list + the open room both use this).
export function onRichMessages(cb: (messages: RichMessage[]) => void): () => void {
  const id = `aangan-rich-${++seq}`;
  NCEngine.addMessageHandler(
    id,
    new MessageHandler({
      onMessageReceived({ messages }) {
        const rich = messages
          .filter(isGroup)
          .map(toRich)
          .filter((m): m is RichMessage => m !== null);
        if (rich.length) cb(rich);
      },
    }),
  );
  return () => NCEngine.removeMessageHandler(id);
}

export interface ReactionChange {
  channelId: string;
  messageId: string;
  /** Keys set to new values (already split into emojis). */
  set: Record<string, string[]>;
  /** Keys removed. */
  removed: string[];
}

// Live reaction changes from anyone in any group channel.
export function onReactionChanges(cb: (change: ReactionChange) => void): () => void {
  const id = `aangan-reactions-${++seq}`;
  NCEngine.addMessageHandler(
    id,
    new MessageHandler({
      onMessageMetadataUpdated(e) {
        if (e.channelIdentifier.channelType !== ChannelType.GROUP) return;
        cb({ channelId: e.channelIdentifier.channelId, messageId: e.messageId, set: reactionsFrom(Object.entries(e.metadata)), removed: [] });
      },
      onMessageMetadataDeleted(e) {
        if (e.channelIdentifier.channelType !== ChannelType.GROUP) return;
        cb({
          channelId: e.channelIdentifier.channelId,
          messageId: e.messageId,
          set: {},
          removed: e.keys.filter((k) => k.startsWith(REACTION_PREFIX)),
        });
      },
    }),
  );
  return () => NCEngine.removeMessageHandler(id);
}

// ---- sending -----------------------------------------------------------------------

function sendFailed(code: number): Error {
  return new Error(`Could not send (code ${code}). Please try again.`);
}

// Text, or a reply to `replyTo`. Asks for read receipts (for "Seen by").
export async function sendRichText(
  channelId: string,
  text: string,
  sender: Sender,
  replyTo?: RichMessage | null,
): Promise<RichMessage> {
  const channel = new GroupChannel(channelId);
  const senderUserInfo = { userId: sender.userId, name: sender.name };
  let res;
  if (replyTo) {
    const original = await sdkMessage(channelId, replyTo.id);
    if (!original) throw new Error('The message you are replying to could not be found.');
    const params = new SendReferenceMessageParams({
      text,
      referMsgId: original.messageId,
      referMsgType: original.messageType,
      referMsgSenderId: original.senderUserId,
      referMsg: original.content,
      senderUserInfo,
    } as ReferenceMessageContent);
    params.needReceipt = true;
    res = await channel.sendMessage(params);
  } else {
    const params = new SendTextMessageParams({ text, senderUserInfo });
    params.needReceipt = true;
    res = await channel.sendMessage(params);
  }
  if (!res.isOk || !res.data) throw sendFailed(res.code);
  const rich = toRich(res.data);
  if (!rich) throw new Error('Sent message could not be shown');
  return rich;
}

// Photo: uploads to the Nexconn file server, then sends an image message.
export async function sendImage(
  channelId: string,
  file: File,
  sender: Sender,
  onProgress?: (percent: number) => void,
): Promise<RichMessage> {
  const prepared = await Helper.createSendImageMessageParams(file);
  if (!prepared.isOk || !prepared.data) throw new Error(`This photo could not be prepared (code ${prepared.code}).`);
  const params = prepared.data;
  (params.content as ImageMessageContent).senderUserInfo = { userId: sender.userId, name: sender.name };
  params.needReceipt = true;
  if (onProgress) params.onUploadProgress = (p) => onProgress(p);
  const res = await new GroupChannel(channelId).sendMediaMessage(params);
  if (!res.isOk || !res.data) throw sendFailed(res.code);
  const rich = toRich(res.data);
  if (!rich) throw new Error('Sent photo could not be shown');
  return rich;
}

// Set the current user's reactions on a message (empty list = remove them).
export async function setMyReactions(channelId: string, messageId: string, userId: string, emojis: string[]): Promise<void> {
  const msg = await sdkMessage(channelId, messageId);
  if (!msg) throw new Error('Message not found');
  const key = reactionKey(userId);
  const res = emojis.length ? await msg.setMetadata({ [key]: emojis.join(',') }) : await msg.deleteMetadata([key]);
  if (!res.isOk) throw new Error(`Reaction failed (code ${res.code})`);
}

// Voice message: the recorded audio plus its transcript (in content.extra), so
// others can read it, play it, and have it translated like any text.
export async function sendVoice(
  channelId: string,
  audio: File,
  transcript: string,
  lang: string,
  sender: Sender,
  onProgress?: (percent: number) => void,
): Promise<RichMessage> {
  const prepared = await Helper.createSendHDVoiceMessageParams(audio);
  if (!prepared.isOk || !prepared.data) throw new Error(`This recording could not be prepared (code ${prepared.code}).`);
  const params = prepared.data;
  const content = params.content as HDVoiceMessageContent & { extra?: string };
  content.extra = JSON.stringify({ transcript, lang });
  content.senderUserInfo = { userId: sender.userId, name: sender.name };
  params.needReceipt = true;
  if (onProgress) params.onUploadProgress = (p) => onProgress(p);
  const res = await new GroupChannel(channelId).sendMediaMessage(params);
  if (!res.isOk || !res.data) throw sendFailed(res.code);
  const rich = toRich(res.data);
  if (!rich) throw new Error('Sent voice message could not be shown');
  return rich;
}

// Fallback when audio cannot be recorded: the transcript as text, marked "spoken".
export async function sendSpokenText(channelId: string, text: string, sender: Sender): Promise<RichMessage> {
  const params = new SendTextMessageParams({
    text,
    senderUserInfo: { userId: sender.userId, name: sender.name },
    extra: JSON.stringify({ spoken: true }),
  } as TextMessageContent);
  params.needReceipt = true;
  const res = await new GroupChannel(channelId).sendMessage(params);
  if (!res.isOk || !res.data) throw sendFailed(res.code);
  const rich = toRich(res.data);
  if (!rich) throw new Error('Sent message could not be shown');
  return rich;
}
