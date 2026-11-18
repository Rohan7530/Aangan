// The Aangan mark: a home seen from above. Blue roofs on four sides with a
// doorway in each, the open white courtyard in the middle, and a planter at
// its heart. Same drawing as the favicon in index.html.
export function BrandMark({ size = 48, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect width="64" height="64" rx="15" fill="#0062cc" />
      {/* roof ring */}
      <rect x="9" y="9" width="46" height="46" rx="9" fill="#2f80e0" />
      {/* open courtyard */}
      <rect x="19" y="19" width="26" height="26" rx="4" fill="#ffffff" />
      {/* doorways into the courtyard */}
      <rect x="28.5" y="9" width="7" height="10" rx="1.5" fill="#ffffff" />
      <rect x="28.5" y="45" width="7" height="10" rx="1.5" fill="#ffffff" />
      <rect x="9" y="28.5" width="10" height="7" rx="1.5" fill="#ffffff" />
      <rect x="45" y="28.5" width="10" height="7" rx="1.5" fill="#ffffff" />
      {/* tulsi planter */}
      <rect x="26" y="26" width="12" height="12" rx="2.5" fill="#0062cc" />
      <circle cx="32" cy="32" r="3.2" fill="#ffffff" />
    </svg>
  );
}
