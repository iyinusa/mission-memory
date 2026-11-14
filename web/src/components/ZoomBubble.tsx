import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BeatImage } from "../lib/types";

const WIDTH = 320;
const GAP = 34; // room for the thought-bubble dots between thumbnail and bubble
const OPEN_DELAY = 90;
const CLOSE_MS = 220;

interface Place {
  x: number;
  y: number;
  side: "right" | "left";
  dots: { x: number; y: number; r: number }[];
}

function place(anchor: DOMRect): Place {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(WIDTH, vw - 32);
  const h = w * 0.75 + 64; // photo + caption
  const side = anchor.right + GAP + w <= vw - 16 ? "right" : "left";
  const x = side === "right" ? anchor.right + GAP : Math.max(16, anchor.left - GAP - w);
  const y = Math.min(vh - h - 16, Math.max(16, anchor.top + anchor.height / 2 - h / 2));
  // Two dots rising from the thumbnail toward the bubble, like a comic thought bubble.
  const from = { x: side === "right" ? anchor.right : anchor.left, y: anchor.top + anchor.height / 2 };
  const to = { x: side === "right" ? x : x + w, y: Math.min(y + h - 12, Math.max(y + 12, from.y)) };
  const at = (t: number) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  return { x, y, side, dots: [{ ...at(0.3), r: 3.5 }, { ...at(0.68), r: 6 }] };
}

/**
 * Hover (or focus, or tap) a thumbnail to pop its full NASA photo out in a thought bubble.
 * Spread `bind` on the trigger element and render `bubble` anywhere.
 */
export function useZoomBubble(photo?: BeatImage) {
  const [spot, setSpot] = useState<Place | null>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef(0);

  const open = (el: Element) => {
    window.clearTimeout(timer.current);
    const rect = el.getBoundingClientRect();
    timer.current = window.setTimeout(() => {
      setClosing(false);
      setSpot(place(rect));
    }, OPEN_DELAY);
  };
  const close = () => {
    window.clearTimeout(timer.current);
    setClosing(true);
    timer.current = window.setTimeout(() => setSpot(null), CLOSE_MS);
  };

  // A bubble left open while the page scrolls would point at the wrong place.
  useEffect(() => {
    if (!spot) return;
    const shut = () => close();
    window.addEventListener("scroll", shut, { passive: true, once: true });
    return () => window.removeEventListener("scroll", shut);
  }, [spot]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const bind = {
    onPointerEnter: (e: React.PointerEvent<Element>) => e.pointerType === "mouse" && open(e.currentTarget),
    onPointerLeave: (e: React.PointerEvent<Element>) => e.pointerType === "mouse" && close(),
    onFocus: (e: React.FocusEvent<Element>) => open(e.currentTarget),
    onBlur: () => close(),
    // Touch: tap to open, tap again to close.
    onClick: (e: React.MouseEvent<Element>) => {
      if ((e.nativeEvent as PointerEvent).pointerType === "mouse") return;
      if (spot && !closing) close();
      else open(e.currentTarget);
    },
  };

  const bubble =
    photo && spot
      ? createPortal(
          <div className={`zoom${closing ? " closing" : ""} from-${spot.side}`} role="tooltip" aria-hidden="true">
            {spot.dots.map((d, i) => (
              <span key={i} className="zoom-dot" style={{ left: d.x - d.r, top: d.y - d.r, width: d.r * 2, height: d.r * 2, animationDelay: `${i * 60}ms` }} />
            ))}
            <figure className="zoom-bubble" style={{ left: spot.x, top: spot.y, width: Math.min(WIDTH, window.innerWidth - 32) }}>
              <div className="zoom-frame">
                <img src={photo.full ?? photo.src} alt="" />
              </div>
              <figcaption>
                {photo.illustration && <span className="tag">Illustration</span>} {photo.caption} <span className="zoom-credit">{photo.credit}</span>
              </figcaption>
            </figure>
          </div>,
          document.body,
        )
      : null;

  return { bind, bubble };
}

/** A thumbnail with the zoom bubble built in. */
export default function ZoomPhoto({ photo, className, label = true }: { photo: BeatImage; className?: string; label?: boolean }) {
  const { bind, bubble } = useZoomBubble(photo);
  return (
    <>
      <img src={photo.src} alt={label ? `${photo.alt} (show larger)` : ""} className={className} tabIndex={label ? 0 : -1} {...bind} />
      {bubble}
    </>
  );
}
