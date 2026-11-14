import { formatDate, formatLatLon } from "../lib/data";
import type { Artifact } from "../lib/types";
import { LogoMark } from "./Logo";
import { STATUS_LABEL } from "./StatusChip";

export default function Postcard({ artifact, message }: { artifact: Artifact; message: string }) {
  // NSSDCA coordinates are landing sites; rovers later drove away from them.
  const landed = artifact.lat != null && artifact.lon != null;
  return (
    <section className="postcard-wrap">
      <h2 tabIndex={-1}>A postcard for you</h2>
      <div className="postcard" id="postcard">
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
          </dl>
          <p className="postcard-site">missionmemory.kenaff.com</p>
        </div>
      </div>
      <button type="button" className="button" onClick={() => window.print()}>
        Print or save my postcard
      </button>
    </section>
  );
}
