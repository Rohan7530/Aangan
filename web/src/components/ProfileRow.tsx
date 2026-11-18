import type { ConnectionState } from '../nexconn/types';
import { Avatar } from './Avatar';
import { GearIcon } from './icons';

const STATUS: Record<ConnectionState, { text: string; dot: string }> = {
  connected: { text: 'Connected', dot: 'bg-success' },
  connecting: { text: 'Connecting…', dot: 'bg-warning' },
  offline: { text: 'Offline', dot: 'bg-danger-fill' },
};

interface Props {
  me: { userId: string; name: string };
  connection: ConnectionState;
  open: boolean;
  onToggle: () => void;
  size: 'standard' | 'comfort' | 'rail';
}

// Bottom of the sidebar: me (avatar with a status dot, name, status) as the
// button that opens Settings. The status is always written out, never colour alone.
export function ProfileRow({ me, connection, open, onToggle, size }: Props) {
  const status = STATUS[connection];
  const comfort = size === 'comfort';
  const avatar = (
    <span className="relative shrink-0">
      <Avatar id={me.userId} name={me.name} size={comfort ? 52 : 40} mine />
      <span className={`status-dot ${status.dot}`} aria-hidden="true" />
    </span>
  );
  if (size === 'rail') {
    return (
      <button
        type="button"
        data-settings-trigger
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`Settings, ${me.name}, ${status.text}`}
        title={`${me.name}: settings`}
        className="grid h-12 w-12 place-items-center rounded-[var(--radius-card)] hover:bg-fill"
      >
        {avatar}
      </button>
    );
  }
  return (
    <button
      type="button"
      data-settings-trigger
      onClick={onToggle}
      aria-expanded={open}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-card)] text-left ${open ? 'bg-accent-soft' : 'hover:bg-fill'} ${
        comfort ? 'min-h-[76px] px-3 py-2' : 'min-h-[56px] px-2 py-1.5'
      }`}
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-semibold leading-tight ${comfort ? 'text-[1.375rem]' : ''}`}>{me.name}</span>
        <span className={`block leading-tight text-ink-muted ${comfort ? 'text-[1.125rem]' : 'text-[1rem]'}`}>{status.text}</span>
      </span>
      <span className={`inline-flex shrink-0 items-center gap-1.5 font-semibold text-accent-ink ${comfort ? 'text-[1.25rem]' : ''}`}>
        <GearIcon />
        <span className={comfort ? '' : 'sr-only'}>Settings</span>
      </span>
    </button>
  );
}
