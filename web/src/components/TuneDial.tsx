import { useEffect, useMemo, useRef, useState } from "react";
import { formatDial } from "../lib/data";
import type { Station } from "../lib/useTuner";
import type { WorldId } from "../lib/types";

interface Props {
  world: WorldId;
  stations: Station[];
  min: number;
  max: number;
  needle: number;
  strength: number;
  lockedId: string | null;
  scanning: boolean;
  onTune: (v: number) => void;
  onRelease: (v: number) => void;
  onSelect: (id: string) => void;
  onStep: (dir: 1 | -1) => void;
}

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

/** The radio dial: a view of the shared tuner. Drag the needle, click a station, or use the arrow keys. */
export default function TuneDial({ world, stations, min, max, needle, strength, lockedId, scanning, onTune, onRelease, onSelect, onStep }: Props) {
  const [dragging, setDragging] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const noise = useRef<HTMLCanvasElement>(null);
  const span = max - min;
  const pct = (v: number) => ((v - min) / span) * 100;
  const locked = stations.find((s) => s.id === lockedId) ?? null;
  useStatic(noise, 1 - strength);

  const valueAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return min + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onStep(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onStep(-1);
    else if (e.key === "Home") onSelect(stations[0].id);
    else if (e.key === "End") onSelect(stations[stations.length - 1].id);
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

  return (
    <div className="dial">
      <div className="dial-readout" aria-hidden="true">
        <span className="dial-freq">{formatDial(world, needle)}</span>
        <span className="dial-bars">
          {[0.2, 0.45, 0.7, 0.9].map((t) => (
            <i key={t} className={strength >= t ? "on" : ""} />
          ))}
        </span>
        <span className="dial-station">{locked ? locked.name : scanning ? "Scanning…" : "Static"}</span>
      </div>

      <div
        ref={track}
        className={`dial-track${dragging ? " dragging" : ""}${scanning ? " scanning" : ""}`}
        role="slider"
        tabIndex={0}
        aria-label="Tune in to an explorer"
        aria-valuemin={Math.round(min)}
        aria-valuemax={Math.round(max)}
        aria-valuenow={Math.round(needle)}
        aria-valuetext={locked ? `${locked.name}, ${formatDial(world, locked.value)}` : `Static, ${formatDial(world, needle)}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          onTune(valueAt(e.clientX));
        }}
        onPointerMove={(e) => dragging && onTune(valueAt(e.clientX))}
        onPointerUp={(e) => {
          setDragging(false);
          onRelease(valueAt(e.clientX));
        }}
        onPointerCancel={() => setDragging(false)}
      >
        <canvas ref={noise} className="dial-static" width={240} height={24} />
        {ticks.map((t) => (
          <span key={t.v} className={`dial-tick${t.major ? " major" : ""}${t.narrow ? "" : " wide-only"}`} style={{ left: `${pct(t.v)}%` }}>
            {t.major && <em>{formatDial(world, t.v)}</em>}
          </span>
        ))}
        {stations.map((s) => (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            className={`dial-station-mark status-${s.status}${s.strong ? " strong" : ""}${s.id === lockedId ? " current" : ""}`}
            style={{ left: `${pct(s.value)}%` }}
            title={s.name}
            aria-hidden="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSelect(s.id)}
          />
        ))}
        <span className={`dial-needle${strength > 0.85 ? " locked" : ""}`} style={{ left: `${pct(needle)}%` }} aria-hidden="true" />
      </div>
    </div>
  );
}
