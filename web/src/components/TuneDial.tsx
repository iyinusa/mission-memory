import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDial } from "../lib/data";
import type { Status, WorldId } from "../lib/types";

export interface Station {
  id: string;
  name: string;
  value: number;
  status: Status;
  strong: boolean;
}

interface Props {
  world: WorldId;
  stations: Station[];
  min: number;
  max: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** How close (as a fraction of the dial) the needle must be for a station to come through. */
const CAPTURE = 0.04;

function useStatic(canvas: React.RefObject<HTMLCanvasElement | null>, amount: number) {
  const level = useRef(amount);
  level.current = amount;
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const draw = () => {
      const { width, height } = c;
      const img = g.createImageData(width, height);
      const a = level.current * 160;
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.random() < 0.5 ? a : 0;
      }
      g.putImageData(img, 0, 0);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [canvas]);
}

export default function TuneDial({ world, stations, min, max, selectedId, onSelect }: Props) {
  const sorted = useMemo(() => [...stations].sort((a, b) => a.value - b.value), [stations]);
  const selected = sorted.find((s) => s.id === selectedId) ?? null;
  const [needle, setNeedle] = useState(selected?.value ?? (min + max) / 2);
  const [dragging, setDragging] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const noise = useRef<HTMLCanvasElement>(null);
  const span = max - min;
  const pct = (v: number) => ((v - min) / span) * 100;

  // Follow selections made elsewhere (e.g. clicking a pin on the globe).
  useEffect(() => {
    if (selected && !dragging) setNeedle(selected.value);
  }, [selected, dragging]);

  const nearest = useCallback(
    (v: number) => sorted.reduce((best, s) => (Math.abs(s.value - v) < Math.abs(best.value - v) ? s : best), sorted[0]),
    [sorted],
  );
  const near = sorted.length ? nearest(needle) : null;
  const strength = near ? Math.max(0, 1 - Math.abs(near.value - needle) / (span * CAPTURE)) : 0;
  useStatic(noise, 1 - strength);

  const valueAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return min + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span;
  };

  const release = (v: number) => {
    setDragging(false);
    const s = nearest(v);
    if (Math.abs(s.value - v) <= span * CAPTURE) {
      setNeedle(s.value);
      onSelect(s.id);
    }
  };

  const step = (dir: 1 | -1) => {
    const i = selected ? sorted.indexOf(selected) : -1;
    const next = sorted[(i + dir + sorted.length) % sorted.length];
    onSelect(next.id);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") step(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") step(-1);
    else if (e.key === "Home") onSelect(sorted[0].id);
    else if (e.key === "End") onSelect(sorted[sorted.length - 1].id);
    else return;
    e.preventDefault();
  };

  const ticks = useMemo(() => {
    const every = world === "beyond" ? 5 : 15;
    const label = world === "beyond" ? 10 : 45;
    const out: { v: number; major: boolean; narrow: boolean }[] = [];
    // `narrow` labels stay visible on phones; the others hide so they don't collide.
    for (let v = Math.ceil(min / every) * every; v <= max; v += every) out.push({ v, major: v % label === 0, narrow: v % (label * 2) === 0 });
    return out;
  }, [world, min, max]);

  const locked = strength > 0.85 && near;

  return (
    <div className="dial">
      <div className="dial-readout" aria-hidden="true">
        <span className="dial-freq">{formatDial(world, needle)}</span>
        <span className="dial-bars">
          {[0.2, 0.45, 0.7, 0.9].map((t) => (
            <i key={t} className={strength >= t ? "on" : ""} />
          ))}
        </span>
        <span className="dial-station">{locked ? near.name : "Searching…"}</span>
      </div>

      <div
        ref={track}
        className={`dial-track${dragging ? " dragging" : ""}`}
        role="slider"
        tabIndex={0}
        aria-label="Tune in to an explorer"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(needle)}
        aria-valuetext={locked ? `${near.name}, ${formatDial(world, near.value)}` : `Static, ${formatDial(world, needle)}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          setNeedle(valueAt(e.clientX));
        }}
        onPointerMove={(e) => dragging && setNeedle(valueAt(e.clientX))}
        onPointerUp={(e) => release(valueAt(e.clientX))}
        onPointerCancel={() => setDragging(false)}
      >
        <canvas ref={noise} className="dial-static" width={240} height={24} />
        {ticks.map((t) => (
          <span key={t.v} className={`dial-tick${t.major ? " major" : ""}${t.narrow ? "" : " wide-only"}`} style={{ left: `${pct(t.v)}%` }}>
            {t.major && <em>{formatDial(world, t.v)}</em>}
          </span>
        ))}
        {sorted.map((s) => (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            className={`dial-station-mark status-${s.status}${s.strong ? " strong" : ""}${s.id === selectedId ? " current" : ""}`}
            style={{ left: `${pct(s.value)}%` }}
            title={s.name}
            aria-hidden="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSelect(s.id)}
          />
        ))}
        <span className={`dial-needle${locked ? " locked" : ""}`} style={{ left: `${pct(needle)}%` }} aria-hidden="true" />
      </div>
      <p className="dial-hint">Drag the needle, or use the arrow keys, to tune between explorers.</p>
    </div>
  );
}
