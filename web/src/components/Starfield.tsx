import { useEffect, useRef } from "react";

/**
 * The night sky behind every page. `lively` (landing page): more stars, twinkling, smooth.
 * Calm (world and story pages): fewer, dimmer stars drifting slowly at a lower frame rate, so reading
 * and the 3D globe get the attention (and the CPU). Still for reduced motion; paused in a hidden tab.
 */
export default function Starfield({ lively = false }: { lively?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = lively ? 220 : 140;
    const brightness = lively ? 1 : 0.55;
    const frameMs = lively ? 0 : 1000 / 30;
    const stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      z: Math.random() * 0.8 + 0.2, // depth: nearer stars drift faster
      t: Math.random() * Math.PI * 2,
    }));
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = reduce ? 0 : requestAnimationFrame(draw);
      if (document.hidden || now - last < frameMs) return;
      last = now;
      const dpr = Math.min(devicePixelRatio, lively ? 2 : 1.5);
      const w = c.clientWidth * dpr;
      const h = c.clientHeight * dpr;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      g.clearRect(0, 0, w, h);
      g.fillStyle = "#fff";
      for (const s of stars) {
        const x = ((s.x + (reduce ? 0 : now * 0.000004 * s.z)) % 1) * w;
        const twinkle = lively && !reduce ? 0.35 + 0.65 * Math.abs(Math.sin(s.t + now * 0.0012 * s.z)) : 0.8;
        g.globalAlpha = twinkle * s.z * brightness;
        g.beginPath();
        g.arc(x, s.y * h, s.r * dpr, 0, Math.PI * 2);
        g.fill();
      }
    };
    if (reduce) draw(0);
    else raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [lively]);

  return <canvas ref={canvas} className="starfield" aria-hidden="true" />;
}
