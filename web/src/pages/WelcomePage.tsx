import { useId, useMemo, useState, type FormEvent } from 'react';
import { login } from '../api';
import { BrandMark } from '../components/BrandMark';
import { ArrowRightIcon, GlobeIcon, SpeakerIcon, TextSizeIcon } from '../components/icons';
import { StandardMessage } from '../components/StandardMessage';
import { assignTones, ToneProvider } from '../components/tones';
import { ComfortMessage, useSpeech } from '../features/reader-view';
import type { RichMessage } from '../nexconn/rich';
import type { Session } from '../session';

interface Props {
  savedSessions: Session[];
  onLoggedIn: (session: Session) => void;
}

const PROMISES = [
  { icon: <TextSizeIcon />, title: 'Big, clear text', text: 'Comfort mode for anyone who needs it.' },
  { icon: <SpeakerIcon />, title: 'Read aloud', text: 'Any message, with one tap on Listen.' },
  { icon: <GlobeIcon />, title: 'Your own language', text: 'Each person reads in theirs: Hindi, Marathi, English and more.' },
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
      <div className="grid gap-4 sm:grid-cols-[1fr_1.25fr]" aria-label="The same message in two reading modes">
        <figure className="rounded-[28px] border border-line bg-cream p-4 shadow-[0_18px_40px_-24px_rgb(42_37_34/0.45)]">
          <figcaption className="mb-2 font-semibold text-ink-muted">
            <span className="text-ink">Arjun</span> reads it in Standard
          </figcaption>
          <div className="reader-root" data-reader-mode="standard" data-text-step="0">
            <ul className="list-none">
              <StandardMessage msg={SAMPLE} mine={false} first last />
              <StandardMessage msg={REPLY} mine first last seenBy="Seen by Meera" />
            </ul>
          </div>
        </figure>
        <figure className="rounded-[28px] border border-line bg-cream p-4 shadow-[0_18px_40px_-24px_rgb(42_37_34/0.45)]">
          <figcaption className="mb-2 font-semibold text-ink-muted">
            <span className="text-ink">Dadi</span> reads it in Comfort
          </figcaption>
          <div className="reader-root" data-reader-mode="comfort" data-text-step="0">
            <ComfortMessage as="div" msg={SAMPLE} mine={false} speech={speech} />
          </div>
        </figure>
      </div>
    </ToneProvider>
  );
}

export function WelcomePage({ savedSessions, onLoggedIn }: Props) {
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
      onLoggedIn(await login(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4" aria-label="Aangan">
        <a href="/welcome.html" className="flex items-center gap-3" aria-label="Aangan: how it works">
          <BrandMark size={40} />
          <span className="text-[1.5rem] font-bold text-green">Aangan</span>
        </a>
        <a
          href="/showcase"
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-3 font-semibold text-green underline-offset-4 hover:underline"
        >
          See it live
          <ArrowRightIcon />
        </a>
      </nav>

      <main className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:pt-12">
        <div>
          <p className="font-semibold text-terracotta-deep">
            <span lang="hi">आँगन</span> · the family courtyard
          </p>
          <h1 className="mt-3 text-balance text-[2.5rem] font-bold leading-[1.1] tracking-tight text-ink sm:text-[3.25rem]">
            The family chat that reads the way you do.
          </h1>
          <p className="mt-4 max-w-xl text-[1.25rem] leading-relaxed text-ink-muted">
            One message, delivered to each person in the form they can use: large clear text, read aloud, and
            in their own language. So Dadi stays in the conversation too.
          </p>

          <form
            onSubmit={submit}
            noValidate
            className="mt-8 max-w-md rounded-[28px] border border-line bg-surface p-6 shadow-[0_18px_40px_-24px_rgb(42_37_34/0.45)]"
          >
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
              className="mt-3 min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-white px-4 text-[1.25rem] focus:border-green focus-visible:outline-offset-1"
            />
            {error && (
              <p id={errorId} role="alert" className="mt-2 font-semibold text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-5 min-h-[56px] w-full rounded-2xl bg-terracotta px-6 text-[1.25rem] font-bold text-white hover:bg-terracotta-deep disabled:opacity-80"
            >
              {busy ? 'Joining…' : 'Join your family'}
            </button>
            <a
              href="/showcase"
              className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-green bg-transparent px-6 text-[1.125rem] font-semibold text-green hover:bg-green-soft"
            >
              Try the demo
              <ArrowRightIcon />
            </a>

            {savedSessions.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <h2 className="font-bold text-ink">Continue as</h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {savedSessions.map((s) => (
                    <li key={s.userId}>
                      <button
                        type="button"
                        onClick={() => onLoggedIn(s)}
                        className="min-h-[52px] w-full rounded-2xl border-2 border-line bg-cream px-4 text-left text-[1.125rem] font-semibold hover:border-green"
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>

        <ModesPreview />
      </main>

      <section aria-label="What Aangan does" className="border-t border-line bg-cream/70">
        <ul className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-soft text-green">{p.icon}</span>
              <span>
                <span className="block font-bold text-ink">{p.title}</span>
                <span className="block text-ink-muted">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
