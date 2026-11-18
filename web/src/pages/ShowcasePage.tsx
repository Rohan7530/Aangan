import { useState } from 'react';
import { BrandMark } from '../components/BrandMark';

const PHONES = [
  {
    key: 'arjun',
    name: 'Arjun, 24',
    mode: 'Standard',
    note: 'Compact chat bubbles',
    title: "Arjun's phone, Standard mode, live",
  },
  {
    key: 'dadi',
    name: 'Dadi, 71',
    mode: 'Comfort',
    note: 'Large text, one message at a time, Listen',
    title: "Dadi's phone, Comfort mode, live",
  },
] as const;

type Key = (typeof PHONES)[number]['key'];

// The hero for judges: two real Nexconn connections, two family members,
// one room. On narrow screens the phones stack behind a toggle.
export function ShowcasePage() {
  const [active, setActive] = useState<Key>('dadi');

  return (
    <div className="min-h-full">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4" aria-label="Aangan">
        <a href="/" className="flex items-center gap-3 rounded-2xl" aria-label="Aangan home">
          <BrandMark size={40} />
          <span className="text-[1.5rem] font-bold text-green">Aangan</span>
        </a>
        <a
          href="/"
          className="inline-flex min-h-[48px] items-center rounded-2xl border-2 border-green bg-surface px-4 font-semibold text-green hover:bg-green-soft"
        >
          Join your family
        </a>
      </nav>

      <header className="mx-auto max-w-3xl px-5 pb-6 pt-4 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-green-soft px-4 py-1 font-semibold text-green">
          <span className="h-2.5 w-2.5 rounded-full bg-green" aria-hidden="true" />
          Live: two real people, one family room
        </p>
        <h1 className="mt-4 text-balance text-[2.5rem] font-bold leading-tight tracking-tight text-ink sm:text-[3.25rem]">
          One message. Read two ways.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[1.25rem] leading-relaxed text-ink-muted">
          Type in either phone. Arjun sees chat bubbles; Dadi sees the same message in large, clear text she can
          listen to. Both phones are live connections to the same family room.
        </p>
      </header>

      {/* Narrow screens: pick which phone to show. */}
      <div className="mx-auto mb-4 flex max-w-sm gap-2 px-5 lg:hidden" role="group" aria-label="Choose a phone">
        {PHONES.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={active === p.key}
            onClick={() => setActive(p.key)}
            className={`min-h-[52px] flex-1 rounded-2xl border-2 px-3 font-semibold ${
              active === p.key ? 'border-green bg-green text-white' : 'border-line-strong bg-surface text-ink'
            }`}
          >
            {p.name.split(',')[0]} · {p.mode}
          </button>
        ))}
      </div>

      <main className="mx-auto flex max-w-6xl flex-wrap items-start justify-center gap-10 px-5 pb-12">
        {PHONES.map((p) => (
          <section
            key={p.key}
            aria-label={p.title}
            className={`flex-col items-center ${active === p.key ? 'flex' : 'hidden'} lg:flex`}
          >
            <div className="mb-3 text-center">
              <p className="text-[1.375rem] font-bold text-ink">{p.name}</p>
              <p className="text-ink-muted">
                <span className="font-semibold text-terracotta-deep">{p.mode}</span> · {p.note}
              </p>
            </div>
            <div className="phone-frame">
              <iframe className="phone-screen" src={`/showcase/phone?persona=${p.key}`} title={p.title} />
            </div>
          </section>
        ))}
      </main>

      <p className="mx-auto max-w-2xl px-5 pb-12 text-center text-ink-muted">
        Try it: send a message from Arjun&rsquo;s phone, then press <strong className="text-ink">Listen</strong> on
        Dadi&rsquo;s. Under Arjun&rsquo;s message you will see when Dadi has read it.
      </p>
    </div>
  );
}
