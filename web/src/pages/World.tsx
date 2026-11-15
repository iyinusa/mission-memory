import { Link, useParams, useSearchParams } from "react-router";
import Loading from "../components/Loading";
import WorldTuner from "../components/WorldTuner";
import { WORLDS, byWorld } from "../lib/data";
import { useArtifacts, useStories } from "../lib/useArtifacts";
import type { WorldId } from "../lib/types";
import NotFound from "./NotFound";

export default function World() {
  const { worldId } = useParams();
  const [params, setParams] = useSearchParams();
  const { index, error } = useArtifacts();
  const { stories } = useStories();

  if (!worldId || !(worldId in WORLDS)) return <NotFound />;
  if (error) return <p role="alert">Could not load explorers: {error}</p>;
  if (!index || !stories) return <Loading />;
  // Remember the explorer in the URL (?ghost=), so coming back from its story lands on it.
  const remember = (id: string) => setParams({ ghost: id }, { replace: true });
  return (
    // Remount per world so the scan restarts from the left.
    <WorldTuner
      key={worldId}
      world={worldId as WorldId}
      ghosts={byWorld(index, worldId as WorldId)}
      stories={stories}
      startId={params.get("ghost")}
      onPick={remember}
      open={(g) => (
        <Link className="button primary" to={`/ghost/${g.id}`} onClick={() => remember(g.id)}>
          {g.tier === "map" ? "NASA's record ▶" : "Hear its story ▶"}
        </Link>
      )}
    />
  );
}
