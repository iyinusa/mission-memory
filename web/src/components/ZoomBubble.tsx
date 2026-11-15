import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BeatImage } from "../lib/types";
import { useLightbox } from "./Lightbox";

const GAP = 34; // room for the thought-bubble dots between thumbnail and bubble
const CAPTION = 64; // room under the photo for the caption
const OPEN_DELAY = 90;
const CLOSE_MS = 220;

interface Place {
  x: number;
  y: number;
  w: number;
  side: "right" | "left";
  dots: { x: number; y: number; r: number }[];
}

/** Big on desktop (about 40% of the window, up to 600 px), always fitting the window's height. */
function bubbleWidth(vw: number, vh: number): number {
  const wanted = Math.min(600, Math.max(320, vw * 0.4));
  const fitsHeight = ((vh - 32 - CAPTION) * 4) / 3; // the photo frame is 4:3
  return Math.min(wanted, fitsHeight, vw - 32);
}

function place(anchor: DOMRect): Place {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = bubbleWidth(vw, vh);
  const h = (w * 3) / 4 + CAPTION;
  const side = anchor.right + GAP + w <= vw - 16 ? "right" : "left";
  const x = side === "right" ? anchor.right + GAP : Math.max(16, anchor.left - GAP - w);
  const y = Math.min(vh - h - 16, Math.max(16, anchor.top + anchor.height / 2 - h / 2));
  // Two dots rising from the thumbnail toward the bubble, like a comic thought bubble.
  const from = { x: side === "right" ? anchor.right : anchor.left, y: anchor.top + anchor.height / 2 };
  const to = { x: side === "right" ? x : x + w, y: Math.min(y + h - 12, Math.max(y + 12, from.y)) };
  const at = (t: number) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  return { x, y, w, side, dots: [{ ...at(0.3), r: 4 }, { ...at(0.68), r: 7 }] };
}

/**
 * Hover (or focus) a thumbnail to pop its NASA photo out in a thought bubble;
 * click, tap or press Enter to open it full screen. Spread `bind` on the trigger and render `layers` anywhere.
 */
export function useZoomBubble(photo?: BeatImage) {
  const [spot, setSpot] = useState<Place | null>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef(0);
  const lightbox = useLightbox();

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
  const full = (el: Element) => {
    if (!photo) return;
    window.clearTimeout(timer.current);
    setSpot(null);
    lightbox.open(photo, el);
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
    onClick: (e: React.MouseEvent<Element>) => {
      e.stopPropagation();
      full(e.currentTarget);
    },
    onKeyDown: (e: React.KeyboardEvent<Element>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        full(e.currentTarget);
      }
    },
  };

  const bubble =
    photo && spot
      ? createPortal(
          <div className={`zoom${closing ? " closing" : ""} from-${spot.side}`} role="tooltip" aria-hidden="true">
            {spot.dots.map((d, i) => (
              <span key={i} className="zoom-dot" style={{ left: d.x - d.r, top: d.y - d.r, width: d.r * 2, height: d.r * 2, animationDelay: `${i * 60}ms` }} />
            ))}
            <figure className="zoom-bubble" style={{ left: spot.x, top: spot.y, width: spot.w }}>
              <div className="zoom-frame">
                <img src={photo.full ?? photo.src} alt="" />
              </div>
              <figcaption>
                {photo.illustration && <span className="tag">Illustration</span>} {photo.caption} <span className="zoom-credit">{photo.credit} · click to enlarge</span>
              </figcaption>
            </figure>
          </div>,
          document.body,
        )
      : null;

  return {
    bind,
    layers: (
      <>
        {bubble}
        {lightbox.viewer}
      </>
    ),
  };
}

/** A thumbnail with the zoom bubble and full-screen view built in. */
export default function ZoomPhoto({ photo, className, label = true }: { photo: BeatImage; className?: string; label?: boolean }) {
  const { bind, layers } = useZoomBubble(photo);
  return (
    <>
      <img
        src={photo.src}
        alt={label ? `${photo.alt} (open larger)` : ""}
        className={className}
        tabIndex={label ? 0 : -1}
        role={label ? "button" : undefined}
        {...bind}
      />
      {layers}
    </>
  );
}
