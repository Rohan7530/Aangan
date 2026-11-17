import type { ConnectionState } from '../nexconn/types';

const LABEL: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  offline: 'Offline',
};

const DOT: Record<ConnectionState, string> = {
  connecting: 'bg-amber-500',
  connected: 'bg-green-600',
  offline: 'bg-red-600',
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1 text-sm font-medium text-stone-700"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${DOT[state]}`} aria-hidden="true" />
      {LABEL[state]}
    </span>
  );
}
