import { useEffect, useRef, useState } from "react";
import { ionLoop, labText, sparkle, useLabVoice, useLoop, type LabLine } from "../../lib/labSound";

// NSSDCA 2007-043A: "maximum thrust ... of 92 mN" and "a fueled launch mass of 1217.7 kg".
const THRUST_N = 0.092;
const MASS_KG = 1217.7;
const KMH_PER_DAY = ((THRUST_N / MASS_KG) * 86_400 * 3600) / 1000; // ≈ 23.5 km/h gained per day of thrust
const DAYS_PER_SECOND = 2; // each second held is two days of thrust
// Everyday speeds to aim for; the narrator says each one, and the last ends the test.
const MILESTONES: { kmh: number; line: LabLine }[] = [
  { kmh: 100, line: "ion-car" },
  { kmh: 300, line: "ion-train" },
  { kmh: 900, line: "ion-jet" },
  { kmh: 1235, line: "ion-sound" },
];
const FINISH = MILESTONES[MILESTONES.length - 1];

/** Hold to fire Dawn's ion engine: the narrator cheers each milestone, and says when the test is over. */
export default function IonThrust({ mediaBase = "", onStart }: { mediaBase?: string; onStart?: () => void }) {
  const [days, setDays] = useState(0);
  const [thrusting, setThrusting] = useState(false);
  const raf = useRef(0);
  const voice = useLabVoice(mediaBase);
  const engine = useLoop(ionLoop);

  const kmh = days * KMH_PER_DAY + 1e-6; // so the clamped finish (a float round trip) still counts as reached
  const finished = kmh >= FINISH.kmh;
  const reached = MILESTONES.filter((m) => kmh >= m.kmh).pop();
  const on = thrusting && !finished;

  useEffect(() => {
    if (!on) return;
    let last = performance.now();
    raf.current = requestAnimationFrame(function step(now) {
      // Work out the step now: React may run the updater later, after `last` has moved on.
      const add = ((now - last) / 1000) * DAYS_PER_SECOND;
      last = now;
      // Stop exactly at the finish line.
      setDays((d) => Math.min(FINISH.kmh / KMH_PER_DAY, d + add));
      raf.current = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf.current);
  }, [on]);

  // The hum climbs with speed.
  useEffect(() => engine.set(on, Math.min(1, kmh / FINISH.kmh)), [engine, on, kmh]);

  // Each new milestone: a sparkle and the narrator's line (queued so none are cut off).
  const said = useRef<LabLine | null>(null);
  useEffect(() => {
    if (!reached || reached.line === said.current) return;
    said.current = reached.line;
    sparkle();
    voice.say(reached.line);
  }, [reached]);

  const begin = () => {
    if (finished) return;
    onStart?.();
    setThrusting(true);
  };
  // Let go before anything happened? The narrator says to hold on longer.
  const end = () => {
    if (thrusting && !reached && !voice.speaking) voice.say("ion-start");
    setThrusting(false);
  };

  const reset = () => {
    voice.stop();
    said.current = null;
    setDays(0);
  };

  const hold = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId); // a finger sliding off the button keeps thrusting
      begin();
    },
    onPointerUp: end,
    onPointerLeave: end,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) begin();
      }
    },
    onKeyUp: end,
    onBlur: end,
  };

  return (
    <div className="lab">
      <p className="lab-title">Hands-on: hold to thrust</p>
      <svg viewBox="0 0 600 170" className={`lab-svg ion${on ? " on" : ""}`} role="img" aria-label="Dawn with its long solar wings. A blue glow of xenon ions streams from the engine at its base while thrusting.">
        <defs>
          <linearGradient id="plume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fb3ff" />
            <stop offset="1" stopColor="#7fb3ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Stars streak past (downward) faster as speed builds: Dawn moves up, away from its plume. */}
        <g className="ion-stars" stroke="#ffffff55" strokeWidth="1.5">
          {[40, 110, 190, 420, 500, 560].map((x, i) => (
            <line key={x} x1={x} y1={20 + (i % 3) * 45} x2={x} y2={20 + (i % 3) * 45 + Math.min(60, 3 + kmh / 20)} />
          ))}
        </g>
        <rect x="150" y="50" width="122" height="22" rx="2" fill="#2b3a7a" stroke="#6f86ff" />
        <rect x="328" y="50" width="122" height="22" rx="2" fill="#2b3a7a" stroke="#6f86ff" />
        <rect x="272" y="59" width="56" height="4" fill="#c3c9dc" />
        <rect x="280" y="36" width="40" height="48" rx="4" fill="#d9dde8" />
        <rect x="292" y="84" width="16" height="8" fill="#8b93ad" />
        <path className="ion-plume" d="M293 92 L280 166 L320 166 L307 92 Z" fill="url(#plume)" />
      </svg>

      {/* How far to go: each tick is a milestone, the last one ends the test. */}
      <div className="ion-meter" aria-hidden="true">
        <span className="ion-fill" style={{ width: `${Math.min(100, (kmh / FINISH.kmh) * 100)}%` }} />
        {MILESTONES.map((m) => (
          <i key={m.kmh} className={kmh >= m.kmh ? "hit" : ""} style={{ left: `${(m.kmh / FINISH.kmh) * 100}%` }} />
        ))}
      </div>

      <div className="lab-row">
        <button type="button" className="button primary" disabled={finished} {...hold}>
          {finished ? "Test complete ✓" : on ? "Thrusting…" : days > 0 ? "Hold to keep thrusting" : "Hold to thrust"}
        </button>
        <button type="button" className="button" onClick={reset} disabled={days === 0}>
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
        <p>
          {reached
            ? labText(reached.line)
            : "The push is as gentle as the weight of two sheets of paper. Hold the button: every second is two whole days of thrust."}
        </p>
      </div>
      <p className="lab-foot">
        How we worked it out: 0.092 N ÷ 1,217.7 kg (Dawn's launch mass) gives about 23.5 km/h of extra speed per day of thrust. As Dawn used up its xenon
        it got lighter, so the real push added up a little faster. Everyday speeds are rounded; sound travels about 1,235 km/h in air at sea level.
      </p>
    </div>
  );
}
