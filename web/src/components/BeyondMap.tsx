import { useRef } from "react";
import { dialValue } from "../lib/data";
import type { Artifact, Status } from "../lib/types";

// A schematic, not-to-scale map of where the "Beyond" explorers rest.
const SUN = { x: 300, y: 200 };
const ORBITS = { earth: [70, 46], mars: [104, 70], belt: [148, 100], jupiter: [230, 156] } as const;

function onOrbit(orbit: keyof typeof ORBITS, deg: number) {
  const [rx, ry] = ORBITS[orbit];
  const t = (deg * Math.PI) / 180;
  return { x: SUN.x + rx * Math.cos(t), y: SUN.y + ry * Math.sin(t) };
}

const PLACES: Record<string, { at: { x: number; y: number }; where: string; leaving?: boolean }> = {
  kepler: { at: onOrbit("earth", 62), where: "Trailing Earth around the Sun" },
  "near-shoemaker": { at: onOrbit("mars", -125), where: "Resting on asteroid Eros" },
  dawn: { at: onOrbit("belt", 152), where: "Orbiting the dwarf planet Ceres" },
  "pioneer-10": { at: { x: 560, y: 64 }, where: "Heading toward the star Aldebaran", leaving: true },
  "pioneer-11": { at: { x: 44, y: 342 }, where: "Leaving the Solar System", leaving: true },
};
const EARTH = onOrbit("earth", 100);
const STATUS_COLOR: Record<Status, string> = { active: "var(--active)", dormant: "var(--dormant)", silent: "var(--silent)" };

interface Props {
  ghosts: Artifact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Dragging across the map scrubs the tuner through launch years. */
  needle: number;
  min: number;
  span: number;
  /** While scanning, explorers appear as the dial passes their launch year. */
  scanning: boolean;
  /** Thumbnail URL per explorer id. */
  portraits?: Record<string, string>;
  onTune: (v: number) => void;
  onRelease: (v: number) => void;
}

// A wedge of the radar sweep, centred on the Sun.
const SWEEP = `M${SUN.x} ${SUN.y}L${SUN.x + 320} ${SUN.y}A320 320 0 0 0 ${SUN.x + 320 * Math.cos(-0.5)} ${SUN.y + 320 * Math.sin(-0.5)}Z`;

export default function BeyondMap({ ghosts, selectedId, onSelect, needle, min, span, scanning, portraits, onTune, onRelease }: Props) {
  // Two turns of the sweep across the whole dial; it follows the needle whether scanning or dragged.
  const sweepDeg = ((needle - min) / span) * 720;
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);
  const valueAt = (e: React.PointerEvent<SVGSVGElement>) => drag.current!.from + ((e.clientX - drag.current!.x) / e.currentTarget.clientWidth) * span;

  return (
    <svg
      viewBox="0 0 600 400"
      className="beyond-map"
      role="img"
      aria-label="Schematic map of the Solar System showing where each explorer rests. Not to scale."
      onPointerDown={(e) => (drag.current = { x: e.clientX, from: needle, moved: false })}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || (!d.moved && Math.abs(e.clientX - d.x) < 6)) return;
        d.moved = true;
        onTune(valueAt(e));
      }}
      onPointerUp={(e) => {
        if (drag.current?.moved) onRelease(valueAt(e));
        drag.current = null;
      }}
      onPointerLeave={() => (drag.current = null)}
    >
      <defs>
        <radialGradient id="sun">
          <stop offset="0" stopColor="#fff6d5" />
          <stop offset=".4" stopColor="#ffd166" />
          <stop offset="1" stopColor="#ffd166" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sweep" cx={SUN.x} cy={SUN.y} r="320" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7cf2c8" stopOpacity=".28" />
          <stop offset="1" stopColor="#7cf2c8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <text x="20" y="44" className="beyond-year" aria-hidden="true">
        {Math.floor(needle)}
      </text>
      <path d={SWEEP} fill="url(#sweep)" transform={`rotate(${sweepDeg} ${SUN.x} ${SUN.y})`} aria-hidden="true" />
      <g fill="none" stroke="var(--line)" strokeWidth="1.2">
        <ellipse cx={SUN.x} cy={SUN.y} rx={ORBITS.belt[0]} ry={ORBITS.belt[1]} strokeWidth="18" stroke="#ffffff0a" />
        {(["earth", "mars", "jupiter"] as const).map((o) => (
          <ellipse key={o} cx={SUN.x} cy={SUN.y} rx={ORBITS[o][0]} ry={ORBITS[o][1]} />
        ))}
      </g>
      <circle cx={SUN.x} cy={SUN.y} r="30" fill="url(#sun)" />
      <circle cx={EARTH.x} cy={EARTH.y} r="4" fill="#6fa8ff" />
      <g className="beyond-labels">
        <text x={EARTH.x} y={EARTH.y + 16}>Earth</text>
        <text x={SUN.x} y={SUN.y - ORBITS.mars[1] - 5}>Mars's orbit</text>
        <text x={SUN.x} y={SUN.y - ORBITS.belt[1] - 13}>Asteroid belt</text>
        <text x={SUN.x} y={SUN.y - ORBITS.jupiter[1] - 6}>Jupiter's orbit</text>
        <text x="592" y="392" className="beyond-note">
          Not to scale
        </text>
      </g>
      {ghosts.map((g) => {
        const p = PLACES[g.id];
        if (!p) return null;
        const sel = g.id === selectedId;
        const color = STATUS_COLOR[g.status];
        const launched = !scanning || dialValue(g) <= needle;
        const dx = p.at.x - SUN.x;
        const dy = p.at.y - SUN.y;
        const len = Math.hypot(dx, dy);
        return (
          <g key={g.id} className={`beyond-ghost${sel ? " current" : ""}${launched ? "" : " unlaunched"}`} onClick={() => onSelect(g.id)}>
            {p.leaving && (
              <path d={`M${p.at.x - (dx / len) * 70} ${p.at.y - (dy / len) * 70}L${p.at.x} ${p.at.y}`} stroke={color} strokeWidth="2" strokeDasharray="3 5" />
            )}
            <circle cx={p.at.x} cy={p.at.y} r={sel ? 16 : 10} fill={color} opacity=".18" />
            <circle cx={p.at.x} cy={p.at.y} r={g.tier === "map" ? 3.5 : 5} fill={color} />
            {sel && portraits?.[g.id] && (
              // The explorer's photo, on the opposite side from its label.
              <g transform={`translate(${p.at.x} ${p.at.y > 300 ? p.at.y + 40 : p.at.y - 40})`}>
                <clipPath id={`face-${g.id}`}>
                  <circle r="22" />
                </clipPath>
                <image href={portraits[g.id]} x="-22" y="-22" width="44" height="44" clipPath={`url(#face-${g.id})`} preserveAspectRatio="xMidYMid slice" />
                <circle r="22" fill="none" stroke="var(--signal)" strokeWidth="2" />
              </g>
            )}
            {sel && (
              // Near either edge, align the label inward so long names never run off the map.
              <text
                x={p.at.x > 440 ? 588 : p.at.x < 160 ? 12 : p.at.x}
                y={p.at.y > 300 ? p.at.y - 26 : p.at.y + 30}
                textAnchor={p.at.x > 440 ? "end" : p.at.x < 160 ? "start" : "middle"}
                className="beyond-name"
              >
                {g.name}
                <tspan x={p.at.x > 440 ? 588 : p.at.x < 160 ? 12 : p.at.x} dy="16" className="beyond-where">
                  {p.where}
                </tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
