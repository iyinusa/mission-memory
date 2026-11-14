import { Link, useParams } from "react-router";
import { WORLDS, byWorld } from "../lib/data";
import { useArtifacts } from "../lib/useArtifacts";
import type { WorldId } from "../lib/types";
import NotFound from "./NotFound";

export default function World() {
  const { worldId } = useParams();
  const { index, error } = useArtifacts();

  if (!worldId || !(worldId in WORLDS)) return <NotFound />;
  const world = WORLDS[worldId as WorldId];

  return (
    <section>
      <h1>{world.name}</h1>
      <p className="lede">{world.tagline}</p>
      {error && <p role="alert">Could not load explorers: {error}</p>}
      <ul className="ghost-list">
        {index &&
          byWorld(index, worldId as WorldId).map((a) => (
            <li key={a.id}>
              <Link to={`/ghost/${a.id}`}>
                <strong>{a.name}</strong> <span className={`status status-${a.status}`}>{a.statusNote}</span>
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}
