import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Status } from "./types";

export interface Station {
  id: string;
  name: string;
  value: number;
  status: Status;
  strong: boolean;
}

/** How close (as a fraction of the dial) the needle must be for a station to come through. */
export const CAPTURE = 0.04;
const SCAN_SECONDS = 18; // one full sweep of the dial
const DWELL_MS = { strong: 7000, weak: 1800 };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One tuner shared by the dial, the globe and the Beyond map.
 * `scan` mode sweeps the needle left to right on its own, pausing on each explorer;
 * any manual input switches to `manual`.
 */
export function useTuner(stations: Station[], min: number, max: number, startId: string | null) {
  const span = max - min;
  const sorted = useMemo(() => [...stations].sort((a, b) => a.value - b.value), [stations]);
  const byId = (id: string | null) => sorted.find((s) => s.id === id) ?? null;

  const autoplay = !startId && !reducedMotion();
  const start = byId(startId) ?? (autoplay ? null : sorted.find((s) => s.strong) ?? sorted[0] ?? null);
  const [needle, setNeedleState] = useState(start ? start.value : min);
  const [lockedId, setLockedId] = useState<string | null>(start?.id ?? null);
  const [mode, setMode] = useState<"scan" | "manual" | "done">(autoplay ? "scan" : "manual");
  const scan = useRef({ needle: start ? start.value : min, dwellUntil: 0 });
  // Refs so the animation loop reads fresh values without restarting.
  const lockedIdRef = useRef(lockedId);
  lockedIdRef.current = lockedId;
  const byIdRef = useRef(byId);
  byIdRef.current = byId;

  const nearest = useCallback(
    (v: number) => (sorted.length ? sorted.reduce((b, s) => (Math.abs(s.value - v) < Math.abs(b.value - v) ? s : b), sorted[0]) : null),
    [sorted],
  );
  const near = nearest(needle);
  const strength = near ? Math.max(0, 1 - Math.abs(near.value - needle) / (span * CAPTURE)) : 0;

  const setNeedle = (v: number) => {
    scan.current.needle = v;
    setNeedleState(v);
  };

  // Autoplay sweep.
  useEffect(() => {
    if (mode !== "scan") return;
    let last = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = scan.current;
      if (now >= s.dwellUntil) {
        const prev = s.needle;
        let v = prev + (span / SCAN_SECONDS) * dt;
        if (v >= max) {
          setNeedle(max);
          setMode("done");
          return;
        }
        // Only lock explorers the needle has just crossed going forward, so close neighbours
        // (InSight and Viking 2 are 1.3° apart) can't pull the needle back and forth.
        const hit = sorted.find((st) => st.value > prev && st.value <= v);
        if (hit) {
          v = hit.value;
          s.dwellUntil = now + (hit.strong ? DWELL_MS.strong : DWELL_MS.weak);
          setLockedId(hit.id);
        } else if (lockedIdRef.current && Math.abs((byIdRef.current(lockedIdRef.current)?.value ?? v) - v) > span * CAPTURE) {
          setLockedId(null);
        }
        setNeedle(v);
      }
      raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [mode, sorted, span, max]);

  /** Manual tuning (dragging the dial, the globe or the map). */
  const tune = (v: number) => {
    setMode("manual");
    setNeedle(Math.min(max, Math.max(min, v)));
    const n = nearest(v);
    setLockedId(n && Math.abs(n.value - v) <= span * CAPTURE * 0.5 ? n.id : null);
  };

  /** Letting go: snap onto a nearby station, or stay in the static. */
  const release = (v: number) => {
    const n = nearest(v);
    if (n && Math.abs(n.value - v) <= span * CAPTURE) {
      setNeedle(n.value);
      setLockedId(n.id);
    }
  };

  const select = (id: string) => {
    const s = byId(id);
    if (!s) return;
    setMode("manual");
    setNeedle(s.value);
    setLockedId(id);
  };

  const step = (dir: 1 | -1) => {
    const i = lockedId ? sorted.findIndex((s) => s.id === lockedId) : sorted.findIndex((s) => s.value > needle) - (dir > 0 ? 1 : 0);
    select(sorted[(i + dir + sorted.length) % sorted.length].id);
  };

  const resume = () => {
    const s = scan.current;
    if (mode === "done" || s.needle >= max) {
      s.needle = min;
      setNeedleState(min);
      setLockedId(null);
    }
    s.dwellUntil = 0;
    setMode("scan");
  };

  /** Keep the scan on the current explorer for at least `ms` more (e.g. while the narrator speaks). */
  const hold = (ms: number) => {
    scan.current.dwellUntil = Math.max(scan.current.dwellUntil, performance.now() + ms);
  };

  return { sorted, needle, lockedId, strength, near, mode, tune, release, select, step, resume, hold, pause: () => setMode("manual"), span };
}
