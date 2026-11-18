import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { initialOf } from '../../components/Avatar';
import { Sheet } from '../../components/Sheet';
import { useReaderPrefs } from '../reader-view';
import { TEXT_STEP_LABELS } from '../reader-view/prefs';
import { LANGUAGES } from '../reader-view/translation';
import { useTheme } from './appearance';
import { AVATAR_COLORS } from './profileColors';
import { isSoundOn, playChime, setSoundOn } from './sound';

interface Props {
  open: boolean;
  onClose: () => void;
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

// Settings: profile, how I read, appearance, notifications, sign out.
// The same sheet in both modes; Comfort gets larger text and controls.
export function SettingsSheet({ open, onClose, comfort, me, myColor, profileEditable = true, onRename, onColor, onOpenReader, onSignOut }: Props) {
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
  const nameMsgId = useId();

  // Fresh form each time the panel opens (not when the name changes while open,
  // or the "Saved" message would vanish right after saving).
  const currentName = useRef(me.name);
  currentName.current = me.name;
  useEffect(() => {
    if (open) {
      setName(currentName.current);
      setNameStatus(null);
      setColorStatus(null);
    }
  }, [open]);

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
    <Sheet open={open} onClose={onClose} title="Settings" subtitle={`Signed in as ${me.name}`}>
      <div className={`flex flex-col gap-8 ${text}`}>
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
    </Sheet>
  );
}
