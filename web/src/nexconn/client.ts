// The ONLY file in web/ that imports the Nexconn Chat SDK.
// Every function takes channelId explicitly so more rooms can be added later.
// API names verified against node_modules/@nexconn/chat/index.d.ts (v26.2.1).

import {
  NCEngine,
  AreaCode,
  LogLevel,
  BaseChannel,
  GroupChannel,
  ChannelType,
  ConnectionStatus,
  ConnectionStatusHandler,
  MessageHandler,
  MessageType,
  SendTextMessageParams,
  type Message,
  type TextMessageContent,
} from '@nexconn/chat';
import type { ChatMessage, ConnectionState, NexconnAreaCode, Sender } from './types';

let initialized = false;
let connectPromise: Promise<ConnectOutcome> | null = null;
let handlerSeq = 0;

export interface ConnectOutcome {
  ok: boolean;
  code: number;
  userId?: string;
}

// ---- lifecycle ------------------------------------------------------------

// Must run exactly once per page load (docs: "call initialize only once").
export function initEngine(params: { appKey: string; areaCode: NexconnAreaCode }): void {
  if (initialized) return;
  initialized = true;
  NCEngine.initialize({
    appKey: params.appKey,
    areaCode: AreaCode[params.areaCode],
    logLevel: LogLevel.DEBUG, // TODO: switch to LogLevel.WARN before production
  });
}

// Connect once; the SDK reconnects by itself afterwards (every 5 s).
export function connect(token: string): Promise<ConnectOutcome> {
  if (!connectPromise) {
    connectPromise = NCEngine.connect({ token }).then((res) => {
      if (!res.isOk) connectPromise = null; // allow a retry with a fresh token
      return { ok: res.isOk, code: res.code, userId: res.data?.userId };
    });
  }
  return connectPromise;
}

export async function disconnect(): Promise<void> {
  connectPromise = null;
  await NCEngine.disconnect();
}

// ---- listeners ------------------------------------------------------------

function toState(status: ConnectionStatus): ConnectionState {
  switch (status) {
    case ConnectionStatus.CONNECTED:
      return 'connected';
    case ConnectionStatus.CONNECTING:
    case ConnectionStatus.SUSPENDED: // SDK retries automatically after 5 s
      return 'connecting';
    default:
      return 'offline';
  }
}

export function getConnectionState(): ConnectionState {
  if (!initialized) return 'offline';
  return toState(NCEngine.getConnectionStatus());
}

// Register before connect() so the initial "connecting" transition is not missed.
export function onConnectionState(cb: (state: ConnectionState, code?: number) => void): () => void {
  const id = `aangan-conn-${++handlerSeq}`;
  NCEngine.addConnectionStatusHandler(
    id,
    new ConnectionStatusHandler({
      onConnectionStatusChanged({ status, code }) {
        cb(toState(status), code);
      },
    }),
  );
  return () => NCEngine.removeConnectionStatusHandler(id);
}

// Delivers text messages for one group channel only. All channel types share the
// SDK's single message listener, so we filter by type and id here.
export function onTextMessage(channelId: string, cb: (messages: ChatMessage[]) => void): () => void {
  const id = `aangan-msg-${++handlerSeq}`;
  NCEngine.addMessageHandler(
    id,
    new MessageHandler({
      onMessageReceived({ messages }) {
        const mine = messages
          .filter(
            (m) =>
              m.channelIdentifier.channelType === ChannelType.GROUP &&
              m.channelIdentifier.channelId === channelId,
          )
          .map(toChatMessage)
          .filter((m): m is ChatMessage => m !== null);
        if (mine.length) cb(mine);
      },
    }),
  );
  return () => NCEngine.removeMessageHandler(id);
}

// ---- messages -------------------------------------------------------------

// The display name travels inside the message as senderUserInfo (SDK field on
// every message content), so receivers need no extra lookup.
export async function sendText(channelId: string, text: string, sender: Sender): Promise<ChatMessage> {
  const channel = new GroupChannel(channelId);
  const params = new SendTextMessageParams({
    text,
    senderUserInfo: { userId: sender.userId, name: sender.name },
  });
  const res = await channel.sendMessage(params);
  if (!res.isOk || !res.data) {
    throw new Error(`Send failed (code ${res.code})`);
  }
  const msg = toChatMessage(res.data);
  if (!msg) throw new Error('Sent message was not a text message');
  return msg;
}

// Web has no local message store: history always comes from the server.
// Returns oldest-first so the UI can render top-to-bottom.
export async function loadHistory(
  channelId: string,
  opts: { pageSize?: number; before?: number } = {},
): Promise<ChatMessage[]> {
  const channel = new GroupChannel(channelId);
  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: channel.identifier,
    startTime: opts.before ?? Date.now(),
    pageSize: Math.min(Math.max(opts.pageSize ?? 50, 1), 100),
    isAscending: false, // newest first from the server
  });
  const res = await query.loadNextPage();
  if (!res.isOk) {
    throw new Error(`History failed (code ${res.code})`);
  }
  const rows = res.data?.data ?? [];
  return rows
    .map(toChatMessage)
    .filter((m): m is ChatMessage => m !== null)
    .sort((a, b) => a.sentAt - b.sentAt);
}

// ---- mapping --------------------------------------------------------------

function toChatMessage(msg: Message): ChatMessage | null {
  if (msg.messageType !== MessageType.TEXT) return null; // only text today
  const content = msg.content as TextMessageContent;
  return {
    id: msg.messageId,
    channelId: msg.channelIdentifier.channelId,
    senderId: msg.senderUserId,
    senderName: content.senderUserInfo?.name,
    text: content.text,
    sentAt: msg.sentTime,
  };
}
