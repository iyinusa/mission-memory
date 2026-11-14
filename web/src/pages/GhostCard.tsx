import type { Artifact } from "../lib/types";

// Placeholder for the story player; shared by /ghost, /embed and the MCP view.
export default function GhostCard({ artifact }: { artifact: Artifact }) {
  return (
    <article className="ghost-card">
      <h1>{artifact.name}</h1>
      <p className={`status status-${artifact.status}`}>{artifact.statusNote}</p>
      <p>{artifact.summary}</p>
      <h2>Sources</h2>
      <ul>
        {artifact.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
