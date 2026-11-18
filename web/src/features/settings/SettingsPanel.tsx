import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Avatar, initialOf } from '../../components/Avatar';
import { CloseIcon } from '../../components/icons';
import type { ConnectionState } from '../../nexconn/types';
import { useReaderPrefs } from '../reader-view';
import { TEXT_STEP_LABELS } from '../reader-view/prefs';
import { LANGUAGES } from '../reader-view/translation';
import { useTheme } from './appearance';
import { AVATAR_COLORS } from './profileColors';
import { isSoundOn, playChime, setSoundOn } from './sound';

interface Props {
  onClose: () => void;
  connection: ConnectionState;
  comfort: boolean;
  me: { userId: string; name: string };
  myColor: string;
  /** False in the showcase: the demo family's names stay as they are. */
  profileEditable?: boolean;
  onRename: (name: string) => Promise<void>;
  onColor: (color: string) => Promise<void>;
  onOpenReader: () => void;
  /** Omit to hide "Sign out" (e.g. in the showcase). */
  onSignOut?: () => void;
}

const CONNECTION_TEXT: Record<ConnectionState, string> = { connected: 'Connected', connecting: 'Connecting…', offline: 'Offline' };

// Settings: profile, how I read, appearance, notifications, sign out.
// A panel that pops up from the Settings button (not a full-screen dialog):
// Escape or a click outside closes it and focus goes back to the button.
// Mount it only while open. Same panel in both modes; Comfort is larger.
export function SettingsPanel({ onClose, connection, comfort, me, myColor, profileEditable = true, onRename, onColor, onOpenReader, onSignOut }: Props) {
  const { prefs } = useReaderPrefs();
  const [theme, setTheme] = useTheme();
  const [name, setName] = useState(me.name);
  const [nameStatus, setNameStatus] = useState<{
    kind: 'ok' | 'error' | 'busy';
    text: string;
  } | null>(null);
  const [colorStatus, setColorStatus] = useState<string | null>(null);
  const [sound, setSound] = useState(() => isSoundOn(me.userId));
  const nameId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel once on open; Escape / click outside closes it.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const wrapper = panel.parentElement; // also holds the Settings button
    const trigger = wrapper?.querySelector<HTMLElement>('[data-settings-trigger]');
    panel.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      closeRef.current();
      trigger?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (wrapper && !wrapper.contains(e.target as Node) && !(e.target as Element).closest?.('dialog')) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, []);
  const nameMsgId = useId();


  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setNameStatus({ kind: 'error', text: 'Please type a name.' });
      return;
    }
    if (trimmed === me.name) {
      setNameStatus({ kind: 'ok', text: 'That is already your name.' });
      return;
    }
    setNameStatus({ kind: 'busy', text: 'Saving…' });
    try {
      await onRename(trimmed);
      setNameStatus({
        kind: 'ok',
        text: `Saved. Your family now sees “${trimmed}”.`,
      });
    } catch (err) {
      setNameStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not save. Please try again.',
      });
    }
  }

  async function pickColor(color: string) {
    setColorStatus(null);
    try {
      await onColor(color);
      setColorStatus('Saved.');
    } catch (err) {
      setColorStatus(err instanceof Error ? err.message : 'Could not save. Please try again.');
    }
  }

  const h = comfort ? 'text-[1.5rem] font-bold' : 'text-[1.125rem] font-bold';
  const text = comfort ? 'text-[1.25rem]' : '';
  const tap = comfort ? 'min-h-[64px] text-[1.25rem]' : 'min-h-[48px]';
  const langName = LANGUAGES.find((l) => l.code === prefs.language)?.english ?? 'English';

  return (
    <div ref={panelRef} role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} className={`settings-pop ${comfort ? 'is-comfort' : ''}`}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-cream px-5 py-4">
        <Avatar id={me.userId} name={me.name} size={comfort ? 56 : 44} mine />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className={`font-bold leading-tight text-green ${comfort ? 'text-[1.5rem]' : 'text-[1.25rem]'}`}>
            Settings
          </h2>
          <p className={`truncate text-ink-muted ${comfort ? 'text-[1.125rem]' : 'text-[1rem]'}`}>
            {me.name} · {CONNECTION_TEXT[connection]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            panelRef.current?.parentElement?.querySelector<HTMLElement>('[data-settings-trigger]')?.focus();
          }}
          className={
            comfort
              ? 'inline-flex min-h-[64px] items-center gap-2 rounded-2xl border-2 border-green bg-surface px-4 text-[1.25rem] font-bold text-green hover:bg-green-soft'
              : 'grid h-12 w-12 place-items-center rounded-2xl text-ink-muted hover:bg-sand hover:text-ink'
          }
          aria-label={comfort ? undefined : 'Close settings'}
        >
          <CloseIcon />
          {comfort && <span>Close</span>}
        </button>
      </header>
      <div className={`flex flex-col gap-8 px-5 pb-6 pt-5 ${text}`}>
        {/* ---- Profile ---- */}
        {profileEditable && (
          <section aria-labelledby={`${nameId}-h`}>
            <h3 id={`${nameId}-h`} className={h}>
              Profile
            </h3>
            <form onSubmit={saveName} className="mt-3">
              <label htmlFor={nameId} className="block font-semibold">
                Display name
              </label>
              <div className="mt-2 flex flex-wrap gap-3">
                <input
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={64}
                  autoComplete="name"
                  aria-describedby={nameStatus ? nameMsgId : undefined}
                  className={`min-w-0 flex-1 rounded-2xl border-2 border-line-strong bg-surface px-4 text-ink focus:border-green ${tap}`}
                />
                <button
                  type="submit"
                  disabled={nameStatus?.kind === 'busy'}
                  className={`rounded-2xl bg-green px-5 font-bold text-white hover:bg-[#173a2c] disabled:opacity-70 ${tap}`}
                >
                  Save name
                </button>
              </div>
              <p id={nameMsgId} role="status" className={`mt-2 min-h-[1.5em] font-semibold ${nameStatus?.kind === 'error' ? 'text-danger' : 'text-ink-muted'}`}>
                {nameStatus?.text}
              </p>
            </form>

            <fieldset className="mt-3">
              <legend className="mb-2 font-semibold">Avatar colour</legend>
              <div className="flex flex-wrap gap-3">
                {AVATAR_COLORS.map((c) => (
                  <label key={c.value} className={`color-swatch ${comfort ? 'is-comfort' : ''}`}>
                    <input
                      type="radio"
                      name="avatar-colour"
                      value={c.value}
                      checked={myColor === c.value}
                      onChange={() => void pickColor(c.value)}
                      className="sr-only"
                    />
                    <span className="swatch-dot" style={{ background: c.value }} aria-hidden="true">
                      {initialOf(me.name)}
                    </span>
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              <p role="status" className="mt-2 min-h-[1.5em] font-semibold text-ink-muted">
                {colorStatus}
              </p>
            </fieldset>
          </section>
        )}

        {/* ---- How I read ---- */}
        <section aria-labelledby={`${nameId}-r`}>
          <h3 id={`${nameId}-r`} className={h}>
            How I read
          </h3>
          <p className="mt-1 text-ink-muted">
            {prefs.mode === 'comfort' ? 'Comfort' : 'Standard'} · {langName} · {TEXT_STEP_LABELS[prefs.textStep]} text
          </p>
          <button
            type="button"
            onClick={onOpenReader}
            aria-haspopup="dialog"
            className={`mt-3 rounded-2xl border-2 border-green bg-surface px-5 font-bold text-green hover:bg-green-soft ${tap}`}
          >
            Change how I read
          </button>
        </section>

        {/* ---- Appearance ---- */}
        <fieldset>
          <legend className={`mb-3 ${h}`}>Appearance</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['light', 'dark'] as const).map((t) => (
              <label key={t} className="option-card items-center">
                <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => setTheme(t)} className="sr-only" />
                <span className="radio-dot" aria-hidden="true" />
                <span className="font-bold">{t === 'light' ? 'Light' : 'Dark'}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ---- Notifications ---- */}
        <fieldset>
          <legend className={`mb-3 ${h}`}>Notifications</legend>
          <label className="option-card items-center">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => {
                setSound(e.target.checked);
                setSoundOn(me.userId, e.target.checked);
                if (e.target.checked) playChime();
              }}
              className="check-box"
            />
            <span>
              <span className="block font-bold">Play a sound for new messages</span>
              <span className="block text-ink-muted">A soft chime when someone else writes.</span>
            </span>
          </label>
        </fieldset>

        {/* ---- Sign out ---- */}
        {onSignOut && (
          <section className="border-t border-line pt-5">
            <button
              type="button"
              onClick={onSignOut}
              className={`rounded-2xl border-2 border-danger bg-surface px-5 font-bold text-danger hover:bg-terracotta-soft ${tap}`}
            >
              Sign out
            </button>
            <p className="mt-2 text-ink-muted">Next time, type the same name to come back as {me.name}.</p>
          </section>
        )}
      </div>
    </div>
  );
}
