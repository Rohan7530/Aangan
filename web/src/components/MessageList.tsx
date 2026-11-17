import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../nexconn/types';

interface Props {
  messages: ChatMessage[];
  myUserId: string;
  loading: boolean;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageList({ messages, myUserId, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (loading) {
    return <p className="p-6 text-center text-lg text-stone-500">Loading earlier messages…</p>;
  }
  if (messages.length === 0) {
    return <p className="p-6 text-center text-lg text-stone-500">No messages yet. Say hello!</p>;
  }

  return (
    <ol className="flex flex-col gap-3 p-4" aria-label="Messages">
      {messages.map((m) => {
        const mine = m.senderId === myUserId;
        return (
          <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-lg leading-relaxed shadow-sm ${
                mine ? 'bg-emerald-600 text-white' : 'bg-white text-stone-900'
              }`}
            >
              {!mine && (
                <div className="mb-0.5 text-sm font-semibold text-emerald-800">
                  {m.senderName ?? m.senderId}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
              <div className={`mt-1 text-right text-xs ${mine ? 'text-emerald-100' : 'text-stone-500'}`}>
                {formatTime(m.sentAt)}
              </div>
            </div>
          </li>
        );
      })}
      <div ref={bottomRef} />
    </ol>
  );
}
