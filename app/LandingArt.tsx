/* On-brand landing illustrations. Pure inline SVG, no external assets.
   Palette pulled from CSS custom properties on .lp so they theme together. */

export function HeroArt() {
  return (
    <svg className="lpArtSvg" viewBox="0 0 520 440" fill="none" role="img" aria-label="Extensions passing through a security gate before reaching the editor">
      <defs>
        <linearGradient id="lpGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--lp-brand)" stopOpacity=".55"/>
          <stop offset="1" stopColor="var(--lp-brand)" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="lpGate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--lp-brand)"/>
          <stop offset="1" stopColor="var(--lp-brand-strong)"/>
        </linearGradient>
      </defs>

      {/* soft backdrop */}
      <circle cx="260" cy="210" r="200" fill="url(#lpGlow)" opacity=".5"/>

      {/* incoming extension tiles (left) */}
      <g className="lpArtIn">
        {[[36, 96], [24, 190], [46, 286]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect width="70" height="70" rx="16" fill="var(--lp-surface)" stroke="var(--lp-line-2)"/>
            <rect x="16" y="18" width="38" height="8" rx="4" fill="var(--lp-line-2)"/>
            <rect x="16" y="34" width="26" height="8" rx="4" fill="var(--lp-surface-3)"/>
            <circle cx="54" cy="52" r="7" fill={i === 1 ? "var(--lp-block)" : "var(--lp-review)"}/>
          </g>
        ))}
      </g>

      {/* the gate / shield in the middle */}
      <g transform="translate(210 118)">
        <path d="M50 4 6 24v46c0 40 27 70 44 78 17-8 44-38 44-78V24z" fill="url(#lpGate)" stroke="var(--lp-text)" strokeWidth="3"/>
        <path d="M30 70l14 14 26-30" stroke="var(--lp-text)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>

      {/* verified tile (right, cleared) */}
      <g transform="translate(388 168)">
        <rect width="104" height="104" rx="22" fill="var(--lp-surface)" stroke="var(--lp-line-2)"/>
        <rect x="22" y="26" width="60" height="10" rx="5" fill="var(--lp-text)"/>
        <rect x="22" y="46" width="40" height="9" rx="4.5" fill="var(--lp-line-2)"/>
        <g transform="translate(22 66)">
          <rect width="60" height="20" rx="10" fill="var(--lp-brand)"/>
          <path d="M12 10l5 5 10-11" stroke="var(--lp-text)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <rect x="34" y="6" width="18" height="8" rx="4" fill="var(--lp-text)" opacity=".55"/>
        </g>
      </g>

      {/* flow lines */}
      <g stroke="var(--lp-line-2)" strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round">
        <path d="M116 132 H196"/>
        <path d="M112 226 H196"/>
        <path d="M120 320 H196"/>
        <path d="M312 220 H384"/>
      </g>
    </svg>
  );
}

export function ThreatArt() {
  return (
    <svg className="lpThreatSvg" viewBox="0 0 320 260" fill="none" role="img" aria-label="Most extensions come from unverified publishers">
      <circle cx="160" cy="130" r="120" fill="var(--lp-surface-2)"/>
      {/* cluster of unverified tiles */}
      <g>
        {[[70, 66], [130, 50], [190, 70], [58, 128], [128, 118], [196, 132], [92, 188], [162, 190]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="34" height="34" rx="9"
            fill={i === 4 ? "var(--lp-brand)" : "var(--lp-surface)"}
            stroke={i === 4 ? "var(--lp-text)" : "var(--lp-line-2)"} strokeWidth={i === 4 ? 2.4 : 1.4}/>
        ))}
        {/* the one verified check */}
        <path d="M135 128l6 6 12-13" stroke="var(--lp-text)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
    </svg>
  );
}
