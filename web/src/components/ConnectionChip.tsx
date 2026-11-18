import type { ConnectionState } from '../nexconn/types';

const META: Record<ConnectionState, { label: string; dot: string }> = {
  connected: { label: 'Connected', dot: 'bg-success' },
  connecting: { label: 'Connecting…', dot: 'bg-warning' },
  offline: { label: 'Offline', dot: 'bg-danger-fill' },
};

// Always a word, never colour alone.
export function ConnectionChip({ state }: { state: ConnectionState }) {
  const { label, dot } = META[state];
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-ink-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
