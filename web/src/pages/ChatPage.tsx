import { useCallback, useEffect, useState } from 'react';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { MessageInput } from '../components/MessageInput';
import { MessageList } from '../components/MessageList';
import * as nexconn from '../nexconn/client';
import type { ChatMessage, ConnectionState } from '../nexconn/types';
import type { Session } from '../session';

interface Props {
  session: Session;
  onLogout: () => void;
}

// Nexconn status code: token is incorrect or expired. Nothing to do but log in again.
const CODE_BAD_TOKEN = 31004;

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

export function ChatPage({ session, onLogout }: Props) {
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const { channelId } = session;

  useEffect(() => {
    let cancelled = false;

    nexconn.initEngine({ appKey: session.appKey, areaCode: session.areaCode });

    // Listeners first (docs: register before connect), then connect, then history.
    const offStatus = nexconn.onConnectionState((state) => setConnection(state));
    const offMessages = nexconn.onTextMessage(channelId, (incoming) => {
      setMessages((prev) => mergeMessages(prev, incoming));
    });
    setConnection(nexconn.getConnectionState());

    (async () => {
      const result = await nexconn.connect(session.token);
      if (cancelled) return;
      if (!result.ok) {
        if (result.code === CODE_BAD_TOKEN) {
          onLogout();
          return;
        }
        setFatal(`Could not connect (code ${result.code}). Check the App Key, data center and token.`);
        setLoadingHistory(false);
        return;
      }
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
    };
  }, [session.appKey, session.areaCode, session.token, channelId, onLogout]);

  const send = useCallback(
    async (text: string) => {
      const sent = await nexconn.sendText(channelId, text, { userId: session.userId, name: session.name });
      setMessages((prev) => mergeMessages(prev, [sent]));
    },
    [channelId, session.userId, session.name],
  );

  async function logout() {
    await nexconn.disconnect().catch(() => undefined);
    onLogout();
  }

  return (
    <div className="flex h-full flex-col bg-stone-100">
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-emerald-800">{session.channelName}</h1>
          <p className="truncate text-sm text-stone-600">
            You are <span className="font-medium">{session.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge state={connection} />
          <button onClick={logout} className="text-sm text-stone-600 underline">
            Leave
          </button>
        </div>
      </header>

      {fatal && <p className="bg-red-50 px-4 py-3 text-red-800">{fatal}</p>}

      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} myUserId={session.userId} loading={loadingHistory} />
      </div>

      <MessageInput disabled={connection !== 'connected'} onSend={send} />
    </div>
  );
}
