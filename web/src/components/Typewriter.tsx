import { useEffect, useRef, useState } from "react";

/**
 * Types `text` out like an incoming transmission, at `cps` characters per second.
 * The speed can change mid-way (e.g. to keep pace once the narrator starts) without restarting.
 * Screen readers get the full text at once.
 */
export default function Typewriter({ text, cps = 38 }: { text: string; cps?: number }) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(reduce ? text.length : 0);
  const speed = useRef(cps);
  speed.current = cps;

  useEffect(() => {
    if (reduce) return setN(text.length);
    let typed = 0;
    let last = performance.now();
    setN(0);
    let raf = requestAnimationFrame(function step(now) {
      typed = Math.min(text.length, typed + ((now - last) / 1000) * speed.current);
      last = now;
      setN(Math.floor(typed));
      if (typed < text.length) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [text, reduce]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        {n < text.length && <span className="caret" />}
      </span>
    </>
  );
}
