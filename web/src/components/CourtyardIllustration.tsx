// Empty-room illustration: a quiet courtyard seen from above, with a tulsi
// planter, a charpai, two cups of chai and a rangoli at the door.
export function CourtyardIllustration({ width = 220 }: { width?: number }) {
  return (
    <svg width={width} height={(width * 150) / 220} viewBox="0 0 220 150" aria-hidden="true" focusable="false">
      {/* house walls around the courtyard */}
      <rect x="10" y="8" width="200" height="134" rx="18" fill="#2c624c" />
      <rect x="28" y="24" width="164" height="102" rx="10" fill="#f3e9da" />
      {/* floor tiles */}
      <g stroke="#e4d8c5" strokeWidth="1.5">
        <path d="M28 58h164M28 92h164M69 24v102M110 24v102M151 24v102" />
      </g>
      {/* doorway + rangoli */}
      <rect x="96" y="126" width="28" height="16" fill="#f3e9da" />
      <g transform="translate(110 118)">
        <circle r="9" fill="none" stroke="#a9461f" strokeWidth="2" />
        <circle r="4" fill="#7a5212" />
        <g fill="#a9461f">
          <circle cx="0" cy="-13" r="2" />
          <circle cx="13" cy="0" r="2" />
          <circle cx="-13" cy="0" r="2" />
        </g>
      </g>
      {/* tulsi planter */}
      <rect x="96" y="60" width="28" height="28" rx="5" fill="#a9461f" />
      <circle cx="110" cy="74" r="9" fill="#5f8f6f" />
      <circle cx="104" cy="70" r="4" fill="#78a886" />
      <circle cx="115" cy="78" r="4" fill="#78a886" />
      {/* charpai (woven cot) */}
      <g transform="translate(150 40)">
        <rect width="30" height="54" rx="3" fill="#7a5212" />
        <rect x="4" y="4" width="22" height="46" rx="2" fill="#e8cfa1" />
        <path d="M4 15h22M4 27h22M4 39h22" stroke="#c9a96e" strokeWidth="1.5" />
      </g>
      {/* two cups of chai on a tray */}
      <g transform="translate(46 92)">
        <rect width="30" height="18" rx="4" fill="#8a2846" opacity="0.85" />
        <circle cx="10" cy="9" r="5" fill="#faf4ea" />
        <circle cx="10" cy="9" r="3" fill="#b07a4a" />
        <circle cx="21" cy="9" r="5" fill="#faf4ea" />
        <circle cx="21" cy="9" r="3" fill="#b07a4a" />
      </g>
    </svg>
  );
}
