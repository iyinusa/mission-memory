import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BeatImage } from "../lib/types";

const CLOSE_MS = 240;
const ZOOM = 2.5;

interface Props {
  photo: BeatImage;
  /** Where the photo was opened from: it flies out of (and back toward) this spot. */
  from: DOMRect;
  onClose: () => void;
}

/** Full-screen view of a NASA photo. Click the photo to magnify it where you clicked; move to explore. */
function Viewer({ photo, from, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = () => {
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  };

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      returnTo?.focus?.();
    };
  }, []);

  // Start from the thumbnail's centre, offset from the middle of the screen.
  const offset = {
    "--ox": `${from.left + from.width / 2 - window.innerWidth / 2}px`,
    "--oy": `${from.top + from.height / 2 - window.innerHeight / 2}px`,
  } as React.CSSProperties;

  const at = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  return (
    <div className={`lightbox${closing ? " closing" : ""}`} role="dialog" aria-modal="true" aria-label={photo.alt || photo.caption} onClick={close}>
      <button ref={closeBtn} type="button" className="lightbox-close" aria-label="Close" onClick={close}>
        ✕
      </button>
      <figure className="lightbox-figure" style={offset} onClick={(e) => e.stopPropagation()}>
        <div
          className={`lightbox-frame${zoom ? " zoomed" : ""}`}
          onClick={(e) => setZoom(zoom ? null : at(e))}
          onMouseMove={(e) => zoom && setZoom(at(e))}
        >
          <img
            src={photo.full ?? photo.src}
            alt={photo.alt}
            style={zoom ? { transform: `scale(${ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        </div>
        <figcaption>
          {photo.illustration && <span className="tag">Illustration</span>} {photo.caption}{" "}
          <a href={photo.url} target="_blank" rel="noreferrer">
            {photo.credit}
          </a>
          <span className="lightbox-hint">{zoom ? "Move to explore · click to zoom out" : "Click the photo to zoom in"}</span>
        </figcaption>
      </figure>
    </div>
  );
}

/** `open(photo, element)` shows the full-screen viewer; render `viewer` anywhere. */
export function useLightbox() {
  const [state, setState] = useState<{ photo: BeatImage; from: DOMRect } | null>(null);
  const open = (photo: BeatImage, el: Element) => setState({ photo, from: el.getBoundingClientRect() });
  const viewer = state ? createPortal(<Viewer photo={state.photo} from={state.from} onClose={() => setState(null)} />, document.body) : null;
  return { open, viewer };
}
