import { useId } from "react";

// The Tuning M (same geometry as brand/build.py): an M drawn as a signal wave,
// with a tuning needle locked on its dip. Inline so it works inside the MCP view too.
export function LogoMark({ size = 36, scale = true }: { size?: number; scale?: boolean }) {
  const glow = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="var(--signal)" stopOpacity=".9" />
          <stop offset=".35" stopColor="var(--signal)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {scale && (
        <g stroke="var(--ink-dim)" strokeWidth="1.4" strokeLinecap="round">
          <path d="M8 53h48" opacity=".7" />
          {Array.from({ length: 13 }, (_, i) => 8 + i * 4).map((x) => (
            <path key={x} d={`M${x} 53v${x % 8 === 0 ? 3 : 1.8}`} />
          ))}
        </g>
      )}
      <path
        d="M8 46C12.5 46 14 18 19.5 18S27 38.5 32 38.5 39 18 44.5 18 51.5 46 56 46"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="logo-needle">
        <path d="M32 9V56" stroke="var(--signal)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="32" cy="9" r="7" fill={`url(#${glow})`} />
        <circle cx="32" cy="9" r="2.8" fill="var(--signal)" />
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark size={40} />
      <span className="logo-word">
        Mission <span className="logo-word-dim">Memory</span>
      </span>
    </span>
  );
}
