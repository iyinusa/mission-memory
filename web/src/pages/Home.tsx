import { Link } from "react-router";
import { WORLDS, byWorld } from "../lib/data";
import { useArtifacts } from "../lib/useArtifacts";
import type { WorldId } from "../lib/types";

export default function Home() {
  const { index } = useArtifacts();

  return (
    <section className="hero">
      <h1>Tune in to the explorers NASA left behind.</h1>
      <p className="lede">
        Rovers, landers and probes that finished their missions are still out there. Pick a world, find a
        signal, and let them tell you their story.
      </p>
      <ul className="worlds">
        {(Object.keys(WORLDS) as WorldId[]).map((id) => (
          <li key={id}>
            <Link to={`/world/${id}`} className={`world-card world-${id}`}>
              <span className="world-name">{WORLDS[id].name}</span>
              <span className="world-tag">{WORLDS[id].tagline}</span>
              {index && <span className="world-count">{byWorld(index, id).length} explorers</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
