import { useId, useMemo, useState, type FormEvent } from 'react';
import { login } from '../api';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/figtree';
import '@fontsource/martian-mono/400.css';
import { NightBackdrop, NightMark } from '../components/NightBackdrop';
import { ArrowRightIcon, GlobeIcon, ShieldIcon, SpeakerIcon, TextSizeIcon } from '../components/icons';
import { StandardMessage } from '../components/StandardMessage';
import { assignTones, ToneProvider } from '../components/tones';
import { ComfortMessage, useSpeech } from '../features/reader-view';
import type { RichMessage } from '../nexconn/rich';
import { identityForName, type Identity, type Session } from '../session';

interface Props {
  /** People who have signed in on this browser before. */
  known: Identity[];
  onLoggedIn: (session: Session) => void;
}

const PROMISES = [
  { icon: <TextSizeIcon />, title: 'Big, clear text', text: 'Comfort mode for anyone who needs it.' },
  { icon: <SpeakerIcon />, title: 'Read aloud', text: 'Any message, with one tap on Listen.' },
  { icon: <GlobeIcon />, title: 'Your own language', text: 'Each person reads it in theirs: English, हिन्दी, मराठी, தமிழ், বাংলা.' },
  { icon: <ShieldIcon />, title: 'Scam shield', text: 'Suspicious messages are flagged before anyone taps a link.' },
];

// One real message, rendered by the real components in both reading modes.
const SAMPLE: RichMessage = {
  kind: 'text',
  reactions: {},
  id: 'landing-sample',
  channelId: 'landing',
  senderId: 'landing-meera',
  senderName: 'Meera',
  text: 'Dadi’s eye check-up is on Tuesday at 11. I’ll take her.',
  sentAt: new Date().setHours(10, 42, 0, 0),
};

const REPLY: RichMessage = {
  kind: 'text',
  reactions: {},
  id: 'landing-reply',
  channelId: 'landing',
  senderId: 'landing-arjun',
  senderName: 'Arjun',
  text: 'Thank you, didi! I’ll drop her home after.',
  sentAt: new Date().setHours(10, 44, 0, 0),
};

function ModesPreview() {
  const speech = useSpeech();
  const tones = useMemo(() => assignTones(['landing-meera']), []);
  return (
    <ToneProvider tones={tones}>
      <div className="grid gap-5 sm:grid-cols-[1fr_1.2fr] sm:items-start" aria-label="The same message in two reading modes">
        <figure className="night-panel night-card night-card-tilt-l p-4">
          <figcaption className="night-label mb-3">Arjun · Standard</figcaption>
          <div className="reader-root" data-reader-mode="standard" data-text-step="0">
            <ul className="list-none">
              <StandardMessage msg={SAMPLE} mine={false} first last />
              <StandardMessage msg={REPLY} mine first last seenBy="Seen by Meera" />
            </ul>
          </div>
        </figure>
        <figure className="night-panel night-card night-card-tilt-r p-4 sm:mt-10">
          <figcaption className="night-label mb-3">Dadi · Comfort</figcaption>
          <div className="reader-root" data-reader-mode="comfort" data-text-step="0">
            <ComfortMessage as="div" msg={SAMPLE} mine={false} speech={speech} />
          </div>
        </figure>
      </div>
    </ToneProvider>
  );
}

export function WelcomePage({ known, onLoggedIn }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const helpId = useId();
  const errorId = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please type your name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Same name as someone who used this browser before: same user, not a new member.
      onLoggedIn(await login(trimmed, identityForName(trimmed)?.authKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Please try again.');
      setBusy(false);
    }
  }

  async function continueAs(identity: Identity) {
    setBusy(true);
    setError(null);
    try {
      onLoggedIn(await login(identity.name, identity.authKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="night-page">
      <NightBackdrop />
      {/* Same header as the landing page: the logo is the way home. */}
      <header className="night-nav">
        <div className="night-wrap night-nav-bar">
          <a href="/welcome.html" className="flex items-center gap-3" aria-label="Aangan home">
            <NightMark size={36} />
            <span className="night-display text-[1.25rem] leading-none">
              Aangan
              <small lang="hi" className="mt-1 block font-[family-name:var(--font-night)] text-[1rem] font-semibold text-[#ffb23f]">
                आँगन
              </small>
            </span>
          </a>
          <nav className="night-nav-pill" aria-label="Aangan">
            <a href="/welcome.html#how">How it works</a>
            <a href="/welcome.html#shield">Scam shield</a>
            <a href="/showcase">Live demo</a>
          </nav>
          <a href="/welcome.html#download" className="night-btn night-btn-ghost !min-h-[48px] !gap-2 !px-4 !text-[1rem]">
            <span className="text-[#3fe3c0]">
              <ArrowRightIcon />
            </span>
            Download app
          </a>
        </div>
      </header>

      <main className="night-wrap grid items-center gap-12 pb-16 pt-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pt-14">
        <div>
          <p className="night-eyebrow night-rise">Step into your family room</p>
          <h1 className="night-display night-rise mt-5 text-balance text-[2.5rem] leading-[1.08] sm:text-[3.5rem]" style={{ animationDelay: '80ms' }}>
            Welcome home to your <span className="night-glowtext">family courtyard.</span>
          </h1>
          <p className="night-rise mt-5 max-w-xl text-[1.25rem] leading-relaxed text-ink-muted" style={{ animationDelay: '160ms' }}>
            One message, delivered to each person in the form they can use: large clear text, read aloud, and
            in their own language. So Dadi stays in the conversation too.
          </p>

          <form onSubmit={submit} noValidate className="night-panel night-rise mt-8 max-w-md p-6" style={{ animationDelay: '240ms' }}>
            <label htmlFor="welcome-name" className="block text-[1.25rem] font-bold">
              Your name
            </label>
            <p id={helpId} className="mt-1 text-ink-muted">
              This is how your family will see you.
            </p>
            <input
              id="welcome-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              autoComplete="given-name"
              disabled={busy}
              aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
              aria-invalid={error ? true : undefined}
              className="night-input mt-3"
            />
            {error && (
              <p id={errorId} role="alert" className="mt-2 font-semibold text-danger">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="night-btn night-btn-primary mt-5 w-full disabled:opacity-80">
              {busy ? 'Joining…' : 'Join your family'}
              {!busy && <ArrowRightIcon />}
            </button>
            <a href="/showcase" className="night-btn night-btn-ghost mt-3 w-full">
              Try the demo
              <ArrowRightIcon />
            </a>

            {known.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <h2 className="night-label">Continue as</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {known.map((s) => (
                    <li key={s.userId}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void continueAs(s)}
                        className="night-btn night-btn-ghost w-full !justify-start text-left"
                      >
                        <NightMark size={22} />
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          <p className="night-rise mt-6 flex flex-wrap gap-2" style={{ animationDelay: '320ms' }}>
            <span className="night-pill">Built on Nexconn Chat</span>
            <span className="night-pill">Translation · Listen · Voice · Scam shield</span>
          </p>
        </div>

        <div className="night-rise" style={{ animationDelay: '200ms' }}>
          <ModesPreview />
        </div>
      </main>

      <section aria-label="What Aangan does" className="border-t border-line">
        <ul className="night-wrap grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p) => (
            <li key={p.title} className="night-panel flex items-start gap-3 p-5">
              <span className="night-icon">{p.icon}</span>
              <span>
                <span className="night-display block text-[1.125rem]">{p.title}</span>
                <span className="mt-1 block text-ink-muted">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
