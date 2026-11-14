import { useEffect, useRef, useState } from "react";

// NSSDCA 2007-043A: "maximum thrust ... of 92 mN" and "a fueled launch mass of 1217.7 kg".
const THRUST_N = 0.092;
const MASS_KG = 1217.7;
const KMH_PER_DAY = ((THRUST_N / MASS_KG) * 86_400 * 3600) / 1000; // ≈ 23.5 km/h gained per day of thrust
const MILESTONES = [
  { kmh: 100, text: "100 km/h faster: as fast as a car on a motorway." },
  { kmh: 900, text: "900 km/h faster: as fast as a passenger jet." },
];

/** Hold to fire Dawn's ion engine: one second held = one day of gentle thrust. */
export default function IonThrust() {
  const [days, setDays] = useState(0);
  const [thrusting, setThrusting] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!thrusting) return;
    let last = performance.now();
    raf.current = requestAnimationFrame(function step(now) {
      setDays((d) => d + (now - last) / 1000);
      last = now;
      raf.current = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf.current);
  }, [thrusting]);

  const kmh = days * KMH_PER_DAY;
  const reached = MILESTONES.filter((m) => kmh >= m.kmh).pop();

  const hold = {
    onPointerDown: () => setThrusting(true),
    onPointerUp: () => setThrusting(false),
    onPointerLeave: () => setThrusting(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setThrusting(true);
      }
    },
    onKeyUp: () => setThrusting(false),
    onBlur: () => setThrusting(false),
  };

  return (
    <div className="lab">
      <p className="lab-title">Hands-on: hold to thrust</p>
      <svg viewBox="0 0 600 170" className={`lab-svg ion${thrusting ? " on" : ""}`} role="img" aria-label="Dawn with its long solar wings. A blue glow of xenon ions streams from the engine at its base while thrusting.">
        <defs>
          <linearGradient id="plume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fb3ff" />
            <stop offset="1" stopColor="#7fb3ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Stars streak past (downward) faster as speed builds: Dawn moves up, away from its plume. */}
        <g className="ion-stars" stroke="#ffffff55" strokeWidth="1.5">
          {[40, 110, 190, 420, 500, 560].map((x, i) => (
            <line key={x} x1={x} y1={20 + (i % 3) * 45} x2={x} y2={20 + (i % 3) * 45 + Math.min(60, 3 + kmh / 15)} />
          ))}
        </g>
        <rect x="150" y="50" width="122" height="22" rx="2" fill="#2b3a7a" stroke="#6f86ff" />
        <rect x="328" y="50" width="122" height="22" rx="2" fill="#2b3a7a" stroke="#6f86ff" />
        <rect x="272" y="59" width="56" height="4" fill="#c3c9dc" />
        <rect x="280" y="36" width="40" height="48" rx="4" fill="#d9dde8" />
        <rect x="292" y="84" width="16" height="8" fill="#8b93ad" />
        <path className="ion-plume" d="M293 92 L280 166 L320 166 L307 92 Z" fill="url(#plume)" />
      </svg>

      <div className="lab-row">
        <button type="button" className="button primary" {...hold}>
          {thrusting ? "Thrusting…" : "Hold to thrust"}
        </button>
        <button type="button" className="button" onClick={() => setDays(0)} disabled={days === 0}>
          Reset
        </button>
      </div>

      <dl className="lab-stats" aria-live="polite">
        <dt>Days of thrust</dt>
        <dd>{days.toFixed(1)}</dd>
        <dt>Speed gained</dt>
        <dd>{Math.round(kmh).toLocaleString("en-GB")} km/h</dd>
      </dl>
      <div className="lab-result" aria-live="polite">
        <p>{reached ? reached.text : "The push is as gentle as the weight of two sheets of paper. Keep holding: every second here is a whole day of thrust."}</p>
      </div>
      <p className="lab-foot">
        How we worked it out: 0.092 N ÷ 1,217.7 kg (Dawn's launch mass) gives about 23.5 km/h of extra speed per day. As Dawn used up its xenon it got
        lighter, so the real push added up a little faster.
      </p>
    </div>
  );
}
