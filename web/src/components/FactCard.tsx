import { formatDate, formatLatLon } from "../lib/data";
import type { Artifact } from "../lib/types";
import StatusChip from "./StatusChip";

/** For explorers without a narrated story yet: the verified NASA record. */
export default function FactCard({ artifact }: { artifact: Artifact }) {
  const facts = artifact.evidence.filter((e) => !e.claim.startsWith("location"));
  return (
    <article className="player">
      <header className="player-head">
        <p className="panel-kicker">{artifact.body}</p>
        <h1>{artifact.name}</h1>
        <StatusChip status={artifact.status} note={artifact.statusNote} />
      </header>
      <dl className="facts">
        {artifact.lat != null && artifact.lon != null && (
          <>
            <dt>Landing site</dt>
            <dd>{formatLatLon(artifact.lat, artifact.lon)}</dd>
          </>
        )}
        {artifact.launched && (
          <>
            <dt>Launched</dt>
            <dd>{formatDate(artifact.launched)}</dd>
          </>
        )}
        {artifact.lastContact && (
          <>
            <dt>Last contact</dt>
            <dd>{formatDate(artifact.lastContact)}</dd>
          </>
        )}
      </dl>
      <p className="beat-text">{artifact.summary}</p>
      {facts.length > 0 && (
        <section className="sources" aria-label="What NASA says">
          <h2>What NASA says</h2>
          <ul>
            {facts.map((e, i) => (
              <li key={i}>
                <q>{e.quote}</q>{" "}
                <a href={e.url} target="_blank" rel="noreferrer">
                  {e.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="si-note">
        From NASA's NSSDCA catalog
        {artifact.nssdcaUrl && (
          <>
            {" "}
            (
            <a href={artifact.nssdcaUrl} target="_blank" rel="noreferrer">
              record {artifact.nssdcaId}
            </a>
            )
          </>
        )}
        . Every quote above was checked word for word against the NASA page.
      </p>
    </article>
  );
}
