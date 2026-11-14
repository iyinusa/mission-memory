import { useEffect, useState } from "react";

/** Types `text` out like an incoming transmission. Screen readers get the full text at once. */
export default function Typewriter({ text, cps = 38 }: { text: string; cps?: number }) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) return setN(text.length);
    setN(0);
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const k = Math.min(text.length, Math.floor(((now - start) / 1000) * cps));
      setN(k);
      if (k < text.length) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [text, cps, reduce]);

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
