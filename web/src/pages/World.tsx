import { lazy, Suspense, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import BeyondMap from "../components/BeyondMap";
import Loading from "../components/Loading";
import StatusChip from "../components/StatusChip";
import TuneDial, { type Station } from "../components/TuneDial";
import { WORLDS, byWorld, dialValue } from "../lib/data";
import { useArtifacts, useStories } from "../lib/useArtifacts";
import type { WorldId } from "../lib/types";
import NotFound from "./NotFound";

// three.js only loads on the globe pages.
const Globe = lazy(() => import("../components/Globe"));

export default function World() {
  const { worldId } = useParams();
  const { index, error } = useArtifacts();
  const { stories } = useStories();
  const [params, setParams] = useSearchParams();

  const world = worldId as WorldId;
  const ghosts = useMemo(() => (index && world in WORLDS ? byWorld(index, world) : []), [index, world]);
  const stations: Station[] = useMemo(
    () => ghosts.map((g) => ({ id: g.id, name: g.name, value: dialValue(g), status: g.status, strong: g.tier !== "map" })),
    [ghosts],
  );

  if (!worldId || !(worldId in WORLDS)) return <NotFound />;
  if (error) return <p role="alert">Could not load explorers: {error}</p>;
  if (!index) return <Loading />;

  // Start on the world's hero explorer, and remember the current one in the URL (?ghost=).
  const hero = ghosts.find((g) => g.tier === "hero") ?? ghosts[0];
  const selectedId = params.get("ghost") ?? hero?.id ?? null;
  const selected = ghosts.find((g) => g.id === selectedId) ?? null;
  const select = (id: string) => setParams({ ghost: id }, { replace: true });
  // Explorers with a story introduce themselves; the rest show NASA's catalog summary.
  const intro = selected ? (stories?.stories[selected.id]?.beats[0]?.text.younger ?? selected.summary) : "";

  const values = stations.map((s) => s.value);
  const [min, max] = world === "beyond" ? [Math.floor(Math.min(...values) / 5) * 5 - 2, Math.ceil(Math.max(...values) / 5) * 5 + 2] : [-180, 180];

  return (
    <section className="world">
      <header className="world-head">
        <h1>{WORLDS[world].name}</h1>
        <p className="lede">{WORLDS[world].tagline}</p>
      </header>

      <div className="world-stage">
        <div className="world-view">
          {world === "beyond" ? (
            <BeyondMap ghosts={ghosts} selectedId={selectedId} onSelect={select} />
          ) : (
            <Suspense fallback={<Loading label="Warming up the telescope…" />}>
              <Globe world={world} ghosts={ghosts} selectedId={selectedId} onSelect={select} />
            </Suspense>
          )}
        </div>

        <aside className="world-panel" aria-live="polite">
          {selected && (
            <>
              <p className="panel-kicker">{selected.body}</p>
              <h2>{selected.name}</h2>
              <StatusChip status={selected.status} note={selected.statusNote} />
              <p className="panel-summary">{intro}</p>
              <Link className="button primary" to={`/ghost/${selected.id}`}>
                {selected.tier === "map" ? "Read the NASA record" : "Tune in to its story"}
              </Link>
            </>
          )}
        </aside>
      </div>

      <TuneDial world={world} stations={stations} min={min} max={max} selectedId={selectedId} onSelect={select} />
      <p className="dial-legend">
        {world === "beyond" ? "On this dial, each explorer sits at its launch year." : "On this dial, each explorer sits at its longitude on the map."}
      </p>
    </section>
  );
}
