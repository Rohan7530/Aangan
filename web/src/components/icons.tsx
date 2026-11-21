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

export function PaperclipIcon() {
  return (
    <svg {...base}>
      <path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" />
    </svg>
  );
}

export function SmileIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={3} />
    </svg>
  );
}

export function ReplyIcon() {
  return (
    <svg {...base}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v5" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg {...base}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg {...base}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function SidebarIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...base}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

export function PhotoIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 8" />
    </svg>
  );
}

export function RoomsIcon() {
  return (
    <svg {...base}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg {...base}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg {...base}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6L12 3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg {...base}>
      <path d="M12 3 2.5 20h19L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg {...base}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2" />
    </svg>
  );
}
