import { useEffect, useRef, useState } from "react";

// NASA Science, Moon facts: "an average of 238,855 miles (384,400 kilometers) away".
const MOON_KM = 384_400;
const LIGHT_KM_S = 299_792;
const ROUND_TRIP_S = (2 * MOON_KM) / LIGHT_KM_S; // ≈ 2.56 s, shown in real time

const EARTH_X = 70;
const MOON_X = 540;

type Phase = "idle" | "flying" | "done";

/** Fire a laser at the Apollo reflectors, watch it come back, and measure the Moon's distance yourself. */
export default function LaserRanging() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [stopped, setStopped] = useState<number | null>(null);
  const start = useRef(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const fire = () => {
    setStopped(null);
    setElapsed(0);
    setPhase("flying");
    start.current = performance.now();
    const tick = () => {
      const t = (performance.now() - start.current) / 1000;
      if (t >= ROUND_TRIP_S) {
        setElapsed(ROUND_TRIP_S);
        setPhase("done");
        return;
      }
      setElapsed(t);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const stop = () => setStopped((performance.now() - start.current) / 1000);

  // Pulse position: out to the Moon for the first half, back to Earth for the second.
  const half = ROUND_TRIP_S / 2;
  const f = elapsed < half ? elapsed / half : 2 - elapsed / half;
  const x = EARTH_X + 32 + f * (MOON_X - 22 - EARTH_X - 32);
  const returning = elapsed >= half;
  const clock = stopped ?? elapsed;
  const userKm = stopped != null ? Math.round((LIGHT_KM_S * stopped) / 2) : null;

  return (
    <div className="lab">
      <p className="lab-title">Hands-on: fire the laser</p>
      <svg viewBox="0 0 600 150" className="lab-svg" role="img" aria-label="A laser pulse travelling from a telescope on Earth to a reflector on the Moon and back. Not to scale.">
        <circle cx={EARTH_X} cy="75" r="32" fill="#2f6fd6" />
        <path d={`M${EARTH_X - 26} 62q20-14 40 2t12 30`} fill="#3fae6a" opacity=".85" />
        <circle cx={MOON_X} cy="75" r="22" fill="#c9cfe0" />
        <rect x={MOON_X - 26} y="70" width="6" height="10" fill="#7cf2c8" />
        <line x1={EARTH_X + 32} y1="75" x2={MOON_X - 22} y2="75" stroke="#ffffff22" strokeDasharray="2 6" />
        {phase === "flying" && <circle cx={x} cy="75" r="5" fill={returning ? "#7cf2c8" : "#ff5c7a"} className="lab-pulse" />}
        <text x={EARTH_X} y="135" className="lab-label">Earth</text>
        <text x={MOON_X} y="135" className="lab-label">Moon</text>
        <text x="300" y="20" className="lab-label">about 384,400 km (not to scale)</text>
      </svg>

      <div className="lab-row">
        <span className="lab-clock" aria-live="off">
          {clock.toFixed(2)} s
        </span>
        {phase === "flying" && stopped == null ? (
          <button type="button" className="button primary" onClick={stop}>
            Stop the clock when it comes back!
          </button>
        ) : (
          <button type="button" className="button primary" onClick={fire} disabled={phase === "flying"}>
            {phase === "idle" ? "Fire the laser" : "Fire again"}
          </button>
        )}
      </div>

      <div className="lab-result" aria-live="polite">
        {phase === "done" && (
          <>
            <p>
              The light came back after <strong>{ROUND_TRIP_S.toFixed(2)} seconds</strong>. Light travels about 300,000 km every second, so the
              Moon is about <strong>{MOON_KM.toLocaleString("en-GB")} km</strong> away: half the round trip.
            </p>
            {userKm != null && (
              <p>
                You stopped the clock at <strong>{stopped!.toFixed(2)} s</strong>, which puts the Moon <strong>{userKm.toLocaleString("en-GB")} km</strong> away.{" "}
                {Math.abs(stopped! - ROUND_TRIP_S) < 0.15 ? "Great timing!" : "Real telescopes time it to a tiny fraction of a second."}
              </p>
            )}
          </>
        )}
      </div>
      <p className="lab-foot">How we worked it out: 2 × 384,400 km ÷ 299,792 km/s = 2.56 s. The distance is NASA's average; the Moon's true distance changes a little as it orbits.</p>
    </div>
  );
}
