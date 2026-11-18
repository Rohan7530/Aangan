// Small inline icons. Always decorative (aria-hidden): every button that uses
// one also has a visible text label.

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function SpeakerIcon() {
  return (
    <svg {...base}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg {...base}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg {...base}>
      <path d="M5 12h13" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function TextSizeIcon() {
  return (
    <svg {...base} strokeWidth={2.2}>
      <path d="M3 19 8 6l5 13" />
      <path d="M4.8 15h6.4" />
      <path d="M14 19l3.5-8 3.5 8" />
      <path d="M15.2 16.5h4.6" />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg {...base}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg {...base}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
