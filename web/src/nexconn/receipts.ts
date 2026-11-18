// Group read receipts ("Seen by ..."). Part of the Nexconn layer: the only
// files that import the SDK are in web/src/nexconn/.
// Docs: /chatsdk-web/message/read-receipt.md. Types verified in index.d.ts (v26.2.1):
//   BaseChannel.sendReadReceiptResponse(messageIds)
//   MessageHandler.onMessageReceiptResponse({ responses })
//   BaseChannel.createMessagesReadReceiptUsersQuery({ channelIdentifier, messageId, status })

import { BaseChannel, ChannelType, GroupChannel, MessageHandler, MessageReadReceiptStatus, NCEngine } from '@nexconn/chat';

let seq = 0;

export interface ReadReceiptUpdate {
  messageId: string;
  readCount: number;
  totalCount: number;
  readerIds: string[];
}

export interface NexconnResult {
  ok: boolean;
  code: number;
}

// Tell the sender(s) that these messages were read by the current user.
export async function markRead(channelId: string, messageIds: string[]): Promise<NexconnResult> {
  if (messageIds.length === 0) return { ok: true, code: 0 };
  const res = await new GroupChannel(channelId).sendReadReceiptResponse(messageIds);
  return { ok: res.isOk, code: res.code };
}

// Live updates when members read messages that asked for a receipt.
export function onReadReceipts(channelId: string, cb: (updates: ReadReceiptUpdate[]) => void): () => void {
  const id = `aangan-receipts-${++seq}`;
  NCEngine.addMessageHandler(
    id,
    new MessageHandler({
      onMessageReceiptResponse({ responses }) {
        const mine = responses
          .filter(
            (r) =>
              r.channelIdentifier.channelType === ChannelType.GROUP && r.channelIdentifier.channelId === channelId,
          )
          .map((r) => ({
            messageId: r.messageId,
            readCount: r.readCount,
            totalCount: r.totalCount,
            readerIds: (r.users ?? []).map((u) => u.userId),
          }));
        if (mine.length) cb(mine);
      },
    }),
  );
  return () => NCEngine.removeMessageHandler(id);
}

// Who has read one message (first page, up to 100 readers).
export async function getReaders(channelId: string, messageId: string): Promise<{ ok: boolean; code: number; readerIds: string[] }> {
  const query = BaseChannel.createMessagesReadReceiptUsersQuery({
    channelIdentifier: new GroupChannel(channelId).identifier,
    messageId,
    pageSize: 100,
    status: MessageReadReceiptStatus.RESPONDED,
  });
  const res = await query.loadNextPage();
  const rows = (res.data as { data?: { userId: string }[] } | undefined)?.data ?? [];
  return { ok: res.isOk, code: res.code, readerIds: rows.map((u) => u.userId) };
}
