import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Avatar, initialOf } from '../../components/Avatar';
import { CloseIcon } from '../../components/icons';
import type { ConnectionState } from '../../nexconn/types';
import { useReaderPrefs } from '../reader-view';
import { TEXT_STEP_LABELS } from '../reader-view/prefs';
import { LANGUAGES } from '../reader-view/translation';
import { resizeToSquare } from '../../lib/resizeImage';
import { useThemePref, type ThemePref } from './appearance';
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
  /** A resized picture (data URL), or null to remove my photo. */
  onPhoto: (image: string | null) => Promise<void>;
  myPhoto?: string;
  onOpenReader: () => void;
  /** Omit to hide "Sign out" (e.g. in the showcase). */
  onSignOut?: () => void;
}

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const CONNECTION_TEXT: Record<ConnectionState, string> = { connected: 'Connected', connecting: 'Connecting…', offline: 'Offline' };

// Settings: profile, how I read, appearance, notifications, sign out.
// A panel that pops up from the Settings button (not a full-screen dialog):
// Escape or a click outside closes it and focus goes back to the button.
// Mount it only while open. Same panel in both modes; Comfort is larger.
export function SettingsPanel({ onClose, connection, comfort, me, myColor, myPhoto, profileEditable = true, onRename, onColor, onPhoto, onOpenReader, onSignOut }: Props) {
  const { prefs } = useReaderPrefs();
  const [theme, setTheme] = useThemePref();
  const [photoStatus, setPhotoStatus] = useState<{ kind: 'ok' | 'error' | 'busy'; text: string } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
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

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoStatus({ kind: 'busy', text: 'Saving photo…' });
    try {
      await onPhoto(await resizeToSquare(file));
      setPhotoStatus({ kind: 'ok', text: 'Photo saved.' });
    } catch (err) {
      setPhotoStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save the photo.' });
    }
  }

  async function removePhoto() {
    setPhotoStatus({ kind: 'busy', text: 'Removing…' });
    try {
      await onPhoto(null);
      setPhotoStatus({ kind: 'ok', text: 'Photo removed.' });
    } catch (err) {
      setPhotoStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not remove the photo.' });
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

  // iOS-style grouped sections: a small heading over a white rounded card.
  const h = comfort ? 'px-1 text-[1.5rem] font-bold' : 'px-1 text-[1rem] font-semibold uppercase tracking-wide text-ink-muted';
  const text = comfort ? 'text-[1.25rem]' : '';
  const tap = comfort ? 'min-h-[64px] text-[1.25rem]' : 'min-h-[48px]';
  const card = 'group-card mt-2 p-4';
  const btnPrimary = `rounded-full bg-accent px-5 ${comfort ? 'font-bold' : 'font-semibold'} text-on-accent hover:bg-accent-deep disabled:opacity-70 ${tap}`;
  const btnSecondary = `rounded-full border border-line-strong bg-surface px-5 ${comfort ? 'font-bold' : 'font-semibold'} text-accent-ink hover:bg-accent-soft ${tap}`;
  const langName = LANGUAGES.find((l) => l.code === prefs.language)?.english ?? 'English';

  return (
    <div ref={panelRef} role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} className={`settings-pop ${comfort ? 'is-comfort' : ''}`}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-canvas px-5 py-4">
        <Avatar id={me.userId} name={me.name} size={comfort ? 56 : 44} mine photo={myPhoto} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className={`font-bold leading-tight text-ink ${comfort ? 'text-[1.5rem]' : 'text-[1.25rem]'}`}>
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
              ? 'inline-flex min-h-[64px] items-center gap-2 rounded-full bg-surface px-5 text-[1.25rem] font-bold text-accent-ink shadow-[var(--shadow-1)] hover:bg-accent-soft'
              : 'grid h-12 w-12 place-items-center rounded-full text-ink-muted hover:bg-fill hover:text-ink'
          }
          aria-label={comfort ? undefined : 'Close settings'}
        >
          <CloseIcon />
          {comfort && <span>Close</span>}
        </button>
      </header>
      <div className={`flex flex-col gap-6 px-4 pb-6 pt-4 ${text}`}>
        {/* ---- Profile ---- */}
        {profileEditable && (
          <section aria-labelledby={`${nameId}-h`}>
            <h3 id={`${nameId}-h`} className={h}>
              Profile
            </h3>
            <div className={card}>
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <Avatar id={me.userId} name={me.name} size={comfort ? 80 : 64} mine photo={myPhoto} />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    void pickPhoto(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button type="button" onClick={() => photoInput.current?.click()} disabled={photoStatus?.kind === 'busy'} className={btnPrimary}>
                  {myPhoto ? 'Change photo' : 'Add photo'}
                </button>
                {myPhoto && (
                  <button type="button" onClick={() => void removePhoto()} disabled={photoStatus?.kind === 'busy'} className={btnSecondary}>
                    Remove
                  </button>
                )}
              </div>
              <p role="status" className={`w-full font-semibold empty:hidden ${photoStatus?.kind === 'error' ? 'text-danger' : 'text-ink-muted'}`}>
                {photoStatus?.text}
              </p>
            </div>
            <form onSubmit={saveName}>
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
                  className={`min-w-0 flex-1 rounded-[10px] border border-line-strong bg-surface px-4 text-ink focus:border-accent ${tap}`}
                />
                <button
                  type="submit"
                  disabled={nameStatus?.kind === 'busy'}
                  className={btnPrimary}
                >
                  Save name
                </button>
              </div>
              <p id={nameMsgId} role="status" className={`mt-2 font-semibold empty:hidden ${nameStatus?.kind === 'error' ? 'text-danger' : 'text-ink-muted'}`}>
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
              <p role="status" className="mt-2 font-semibold text-ink-muted empty:hidden">
                {colorStatus}
              </p>
            </fieldset>
            </div>
          </section>
        )}

        {/* ---- How I read ---- */}
        <section aria-labelledby={`${nameId}-r`}>
          <h3 id={`${nameId}-r`} className={h}>
            How I read
          </h3>
          <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
            <p>
              {prefs.mode === 'comfort' ? 'Comfort' : 'Standard'} · {langName} · {TEXT_STEP_LABELS[prefs.textStep]} text
            </p>
            <button type="button" onClick={onOpenReader} aria-haspopup="dialog" className={btnSecondary}>
              Change how I read
            </button>
          </div>
        </section>

        {/* ---- Appearance ---- */}
        <fieldset>
          <legend className={`mb-2 ${h}`}>Appearance</legend>
          <div className={`grid gap-2 ${comfort ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {THEMES.map((t) => (
              <label key={t.value} className="option-card items-center">
                <input type="radio" name="theme" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} className="sr-only" />
                <span className="radio-dot" aria-hidden="true" />
                <span className="font-semibold">{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ---- Notifications ---- */}
        <fieldset>
          <legend className={`mb-2 ${h}`}>Notifications</legend>
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
              <span className="block font-semibold">Play a sound for new messages</span>
              <span className="block text-ink-muted">A soft chime when someone else writes.</span>
            </span>
          </label>
        </fieldset>

        {/* ---- Sign out ---- */}
        {onSignOut && (
          <section>
            <button
              type="button"
              onClick={onSignOut}
              className={`w-full rounded-[var(--radius-card)] bg-surface px-5 font-semibold text-danger hover:bg-danger-soft ${tap}`}
            >
              Sign out
            </button>
            <p className="mt-2 px-1 text-ink-muted">Next time, type the same name to come back as {me.name}.</p>
          </section>
        )}
      </div>
    </div>
  );
}
