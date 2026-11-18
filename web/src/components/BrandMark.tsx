// The Aangan mark: a home seen from above. Deep-green roofs on four sides with
// a doorway in each, the open cream courtyard in the middle, and a terracotta
// tulsi planter at its heart. Same drawing as the favicon in index.html.
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
      <rect width="64" height="64" rx="15" fill="#1f4a39" />
      {/* roof ring */}
      <rect x="9" y="9" width="46" height="46" rx="9" fill="#2c624c" />
      {/* open courtyard */}
      <rect x="19" y="19" width="26" height="26" rx="4" fill="#faf4ea" />
      {/* doorways into the courtyard */}
      <rect x="28.5" y="9" width="7" height="10" rx="1.5" fill="#faf4ea" />
      <rect x="28.5" y="45" width="7" height="10" rx="1.5" fill="#faf4ea" />
      <rect x="9" y="28.5" width="10" height="7" rx="1.5" fill="#faf4ea" />
      <rect x="45" y="28.5" width="10" height="7" rx="1.5" fill="#faf4ea" />
      {/* tulsi planter */}
      <rect x="26" y="26" width="12" height="12" rx="2.5" fill="#a9461f" />
      <circle cx="32" cy="32" r="3.2" fill="#e3ece5" />
    </svg>
  );
}
