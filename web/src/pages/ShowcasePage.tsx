import { useState } from 'react';
import { BrandMark } from '../components/BrandMark';

const VIEWS = [
  { key: 'arjun', name: 'Arjun, 24', mode: 'Standard', note: 'The full web app', src: '/showcase/app?persona=arjun', title: "Arjun's web app, Standard mode, live" },
  { key: 'dadi', name: 'Dadi, 71', mode: 'Comfort', note: 'Large text, Listen, labelled buttons', src: '/showcase/phone?persona=dadi', title: "Dadi's phone, Comfort mode, live" },
] as const;
type Key = (typeof VIEWS)[number]['key'];

// The hero for judges: Arjun's full three-pane web app next to Dadi's phone,
// both live Nexconn connections in the same family room.
export function ShowcasePage() {
  const [active, setActive] = useState<Key>('arjun');
  const [arjun, dadi] = VIEWS;

  return (
    <div className="min-h-full">
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4" aria-label="Aangan">
        <a href="/" className="flex items-center gap-3 rounded-2xl" aria-label="Aangan home">
          <BrandMark size={40} />
          <span className="text-[1.5rem] font-bold text-accent-ink">Aangan</span>
        </a>
        <a href="/" className="inline-flex min-h-[48px] items-center rounded-2xl border-2 border-accent bg-surface px-4 font-semibold text-accent-ink hover:bg-accent-soft">
          Join your family
        </a>
      </nav>

      <header className="mx-auto max-w-3xl px-5 pb-6 pt-2 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1 font-semibold text-accent-ink">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
          Live: two real people, one family room
        </p>
        <h1 className="mt-4 text-balance text-[2.5rem] font-bold leading-tight tracking-tight text-ink sm:text-[3.25rem]">
          One message. Read two ways.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[1.25rem] leading-relaxed text-ink-muted">
          Arjun uses the full web app. Dadi reads the same family room on her phone in Comfort mode: large clear
          text she can listen to. Type in either one.
        </p>
      </header>

      {/* Narrow screens: pick which one to show. */}
      <div className="mx-auto mb-4 flex max-w-sm gap-2 px-5 xl:hidden" role="group" aria-label="Choose a view">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            aria-pressed={active === v.key}
            onClick={() => setActive(v.key)}
            className={`min-h-[52px] flex-1 rounded-2xl border-2 px-3 font-semibold ${
              active === v.key ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink'
            }`}
          >
            {v.name.split(',')[0]} · {v.mode}
          </button>
        ))}
      </div>

      <main className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-center gap-8 px-5 pb-10 xl:flex-nowrap">
        <section aria-label={arjun.title} className={`min-w-0 flex-1 flex-col ${active === 'arjun' ? 'flex' : 'hidden'} xl:flex`}>
          <Caption name={arjun.name} mode={arjun.mode} note={arjun.note} />
          <div className="browser-frame">
            <div className="browser-bar" aria-hidden="true">
              <span />
              <span />
              <span />
              <p>aangan.app</p>
            </div>
            <iframe className="browser-screen" src={arjun.src} title={arjun.title} />
          </div>
        </section>
        <section aria-label={dadi.title} className={`shrink-0 flex-col items-center ${active === 'dadi' ? 'flex' : 'hidden'} xl:flex`}>
          <Caption name={dadi.name} mode={dadi.mode} note={dadi.note} />
          <div className="phone-frame">
            <iframe className="phone-screen" src={dadi.src} title={dadi.title} />
          </div>
        </section>
      </main>

      <p className="mx-auto max-w-2xl px-5 pb-12 text-center text-ink-muted">
        Try it: send a message or a photo from Arjun’s app, then press <strong className="text-ink">Listen</strong> on
        Dadi’s phone. Under Arjun’s message you will see when Dadi has read it.
      </p>
    </div>
  );
}

function Caption({ name, mode, note }: { name: string; mode: string; note: string }) {
  return (
    <div className="mb-3 text-center">
      <p className="text-[1.375rem] font-bold text-ink">{name}</p>
      <p className="text-ink-muted">
        <span className="font-semibold text-danger">{mode}</span> · {note}
      </p>
    </div>
  );
}
