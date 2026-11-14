import { useEffect, useRef, useState } from "react";

/** Plays one narration clip whenever `src` changes (null stops it). Reports the clip length once known. */
export function useNarrator(src: string | null, enabled: boolean, onDuration?: (seconds: number) => void) {
  const [speaking, setSpeaking] = useState(false);
  const durationCb = useRef(onDuration);
  durationCb.current = onDuration;

  useEffect(() => {
    setSpeaking(false);
    if (!src || !enabled) return;
    const a = new Audio(src);
    a.addEventListener("loadedmetadata", () => durationCb.current?.(a.duration));
    a.addEventListener("ended", () => setSpeaking(false));
    a.addEventListener("error", () => setSpeaking(false));
    // Blocked until the visitor has interacted with the page; the text still types out on screen.
    a.play()
      .then(() => setSpeaking(true))
      .catch(() => setSpeaking(false));
    return () => a.pause();
  }, [src, enabled]);

  return { speaking };
}
