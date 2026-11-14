import { toBlob, toPng } from "html-to-image";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { formatDate, formatLatLon } from "../lib/data";
import type { Artifact } from "../lib/types";
import { LogoMark } from "./Logo";
import { STATUS_LABEL } from "./StatusChip";

const NAME_KEY = "mm-name";

function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Link that opens this postcard on another device. The name rides in the #fragment, which browsers never send to a server. */
export function postcardUrl(origin: string, id: string, name: string): string {
  return `${origin}/postcard/${id}${name ? `#to=${encodeURIComponent(name)}` : ""}`;
}

interface Props {
  artifact: Artifact;
  message: string;
  /** Public origin for the phone link ("" means this page's origin). */
  origin?: string;
  /** Pre-filled name (e.g. from the phone link). */
  initialName?: string;
  /** On the phone page itself there is no point offering the QR code. */
  showQr?: boolean;
}

export default function Postcard({ artifact, message, origin = "", initialName, showQr = true }: Props) {
  const [name, setName] = useState(initialName ?? savedName);
  const [qr, setQr] = useState("");
  const card = useRef<HTMLDivElement>(null);
  const base = origin || window.location.origin;
  const link = postcardUrl(base, artifact.id, name.trim());
  // NSSDCA coordinates are landing sites; rovers later drove away from them.
  const landed = artifact.lat != null && artifact.lon != null;
  const fileName = `mission-memory-${artifact.id}.png`;

  useEffect(() => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* not remembered in private mode */
    }
  }, [name]);

  useEffect(() => {
    if (!showQr) return;
    const t = setTimeout(() => {
      QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#05070f", light: "#ffffff" } })
        .then(setQr)
        .catch(() => setQr(""));
    }, 250);
    return () => clearTimeout(t);
  }, [link, showQr]);

  const render = { pixelRatio: 2, backgroundColor: "#f6f1e4" };

  const save = async () => {
    if (!card.current) return;
    const a = document.createElement("a");
    a.href = await toPng(card.current, render);
    a.download = fileName;
    a.click();
  };

  const share = async () => {
    const blob = card.current && (await toBlob(card.current, render));
    const file = blob && new File([blob], fileName, { type: "image/png" });
    const title = `A postcard from ${artifact.name}`;
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title });
      else await navigator.share({ title, url: link });
    } catch {
      /* the visitor closed the share sheet */
    }
  };

  return (
    <section className="postcard-wrap">
      <h2 tabIndex={-1}>A postcard for you</h2>
      <div className="postcard" id="postcard" ref={card}>
        <div className="postcard-msg">
          <p className="postcard-from">From {artifact.name}</p>
          <p className="postcard-text">“{message}”</p>
          <p className="postcard-sign">— {artifact.name}</p>
        </div>
        <div className="postcard-meta">
          <div className="postcard-stamp">
            <LogoMark size={44} />
          </div>
          <dl>
            <dt>{landed ? "Landing site" : "Where it is"}</dt>
            <dd>{landed ? `${artifact.body}, ${formatLatLon(artifact.lat!, artifact.lon!)}` : artifact.body}</dd>
            {artifact.lastContact && (
              <>
                <dt>Last heard from</dt>
                <dd>{formatDate(artifact.lastContact)}</dd>
              </>
            )}
            <dt>Status</dt>
            <dd>{STATUS_LABEL[artifact.status]}</dd>
            <dt>
              <label htmlFor="postcard-to">To</label>
            </dt>
            <dd className="postcard-to">
              <input id="postcard-to" value={name} maxLength={32} placeholder="Write your name" autoComplete="off" onChange={(e) => setName(e.target.value)} />
            </dd>
          </dl>
          <p className="postcard-site">missionmemory.kenaff.com</p>
        </div>
      </div>

      <div className="postcard-actions">
        <button type="button" className="button primary" onClick={save}>
          Save as image
        </button>
        {typeof navigator.share === "function" && (
          <button type="button" className="button" onClick={share}>
            Share
          </button>
        )}
        <button type="button" className="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {showQr && qr && (
        <div className="postcard-qr">
          {/* SVG markup generated locally by the qrcode library from our own URL. */}
          <div className="qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qr }} />
          <p>
            <strong>Send it to your phone:</strong> point your phone's camera at this code to open your postcard there, then save or share it.
            Your name stays on your devices; it is never sent to our server.
          </p>
        </div>
      )}
    </section>
  );
}
