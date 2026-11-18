import type { ChatMessage } from '../nexconn/types';

// Turns a flat message list into render items: day separators plus messages
// that know whether they start or end a run from the same sender.

export type ListItem<T extends ChatMessage = ChatMessage> =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: T; mine: boolean; first: boolean; last: boolean };

const GROUP_GAP_MS = 5 * 60 * 1000;

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayLabel(ms: number, now = Date.now()): string {
  const key = dayKey(ms);
  if (key === dayKey(now)) return 'Today';
  if (key === dayKey(now - 86_400_000)) return 'Yesterday';
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

// Always 12-hour with lowercase am/pm ("12:29 am"), never "0:29",
// whatever the device's locale or 24-hour setting.
export function formatTime(ms: number): string {
  const d = new Date(ms);
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
}

export function senderLabel(msg: ChatMessage): string {
  return msg.senderName?.trim() || 'Family member';
}

function sameRun(a: ChatMessage, b: ChatMessage): boolean {
  return a.senderId === b.senderId && dayKey(a.sentAt) === dayKey(b.sentAt) && Math.abs(b.sentAt - a.sentAt) <= GROUP_GAP_MS;
}

export function buildItems<T extends ChatMessage>(messages: T[], myUserId: string): ListItem<T>[] {
  const items: ListItem<T>[] = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || dayKey(prev.sentAt) !== dayKey(msg.sentAt)) {
      items.push({ kind: 'day', key: `day-${dayKey(msg.sentAt)}`, label: dayLabel(msg.sentAt) });
    }
    items.push({
      kind: 'msg',
      key: msg.id,
      msg,
      mine: msg.senderId === myUserId,
      first: !prev || !sameRun(prev, msg),
      last: !next || !sameRun(msg, next),
    });
  });
  return items;
}

// Room-list time: "4:05 pm" today, "Yesterday", otherwise "12 Nov".
export function formatListTime(ms: number, now = Date.now()): string {
  const key = dayKey(ms);
  if (key === dayKey(now)) return formatTime(ms);
  if (key === dayKey(now - 86_400_000)) return 'Yesterday';
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
