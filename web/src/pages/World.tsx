import { lazy, Suspense, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import BeyondMap from "../components/BeyondMap";
import Loading from "../components/Loading";
import StatusChip from "../components/StatusChip";
import TuneDial from "../components/TuneDial";
import Typewriter from "../components/Typewriter";
import { WORLDS, byWorld, dialValue } from "../lib/data";
import { useArtifacts, useStories } from "../lib/useArtifacts";
import { useRadioSound } from "../lib/useRadioSound";
import { useTuner, type Station } from "../lib/useTuner";
import type { Artifact, StoryIndex, WorldId } from "../lib/types";
import NotFound from "./NotFound";

// three.js only loads on the globe pages.
const Globe = lazy(() => import("../components/Globe"));

export default function World() {
  const { worldId } = useParams();
  const { index, error } = useArtifacts();
  const { stories } = useStories();

  if (!worldId || !(worldId in WORLDS)) return <NotFound />;
  if (error) return <p role="alert">Could not load explorers: {error}</p>;
  if (!index || !stories) return <Loading />;
  // Remount per world so the scan restarts from the left.
  return <Tuner key={worldId} world={worldId as WorldId} ghosts={byWorld(index, worldId as WorldId)} stories={stories} />;
}

function Tuner({ world, ghosts, stories }: { world: WorldId; ghosts: Artifact[]; stories: StoryIndex }) {
  const [params, setParams] = useSearchParams();
  const stations: Station[] = useMemo(
    () => ghosts.map((g) => ({ id: g.id, name: g.name, value: dialValue(g), status: g.status, strong: g.tier !== "map" })),
    [ghosts],
  );
  const [min, max] = useMemo(() => {
    if (world !== "beyond") return [-180, 180];
    const v = stations.map((s) => s.value);
    return [Math.floor(Math.min(...v) / 5) * 5 - 2, Math.ceil(Math.max(...v) / 5) * 5 + 2];
  }, [world, stations]);

  // Coming back from a story (?ghost=) lands on that explorer; a fresh visit starts the scan.
  const tuner = useTuner(stations, min, max, params.get("ghost"));
  const locked = ghosts.find((g) => g.id === tuner.lockedId) ?? null;
  const scanning = tuner.mode === "scan";
  const sound = useRadioSound(tuner.strength, tuner.lockedId);

  const select = (id: string) => {
    tuner.select(id);
    setParams({ ghost: id }, { replace: true });
  };
  const release = (v: number) => tuner.release(v);
  const intro = locked ? (stories.stories[locked.id]?.beats[0]?.text.younger ?? locked.summary) : "";

  return (
    <section className="world">
      <header className="world-head">
        <h1>{WORLDS[world].name}</h1>
        <p className="lede">{WORLDS[world].tagline}</p>
      </header>

      <div className="world-stage">
        <div className="world-view">
          {world === "beyond" ? (
            <BeyondMap
              ghosts={ghosts}
              selectedId={tuner.lockedId}
              onSelect={select}
              needle={tuner.needle}
              min={min}
              span={tuner.span}
              scanning={scanning}
              onTune={tuner.tune}
              onRelease={release}
            />
          ) : (
            <Suspense fallback={<Loading label="Warming up the telescope…" />}>
              <Globe world={world} ghosts={ghosts} needle={tuner.needle} lockedId={tuner.lockedId} onSelect={select} onTune={tuner.tune} onRelease={release} />
            </Suspense>
          )}
          <p className="world-hint" aria-hidden="true">
            {world === "beyond" ? "Drag across the map to scan" : "Drag the globe to tune"}
          </p>
        </div>

        <aside className="world-panel" aria-live="polite">
          {locked ? (
            <>
              <p className="panel-kicker">Signal found · {locked.body}</p>
              <h2>{locked.name}</h2>
              <StatusChip status={locked.status} note={locked.statusNote} />
              <p className="panel-summary">
                <Typewriter key={locked.id} text={intro} />
              </p>
              <Link className="button primary" to={`/ghost/${locked.id}`} onClick={() => setParams({ ghost: locked.id }, { replace: true })}>
                {locked.tier === "map" ? "Read the NASA record" : "Tune in to its story"}
              </Link>
            </>
          ) : (
            <div className="panel-static">
              <p className="panel-kicker">{scanning ? "Scanning" : "Static"}</p>
              <h2>{scanning ? "Listening for explorers…" : "Nothing on this frequency"}</h2>
              <p className="panel-summary">
                {scanning
                  ? `Sweeping the ${world === "beyond" ? "years" : "longitudes"} for a signal from the explorers NASA left behind.`
                  : "Keep tuning: drag the dial or the globe, or tap a glowing marker."}
              </p>
            </div>
          )}
          <div className="scan-controls">
            {scanning ? (
              <button type="button" className="button" onClick={tuner.pause}>
                ❚❚ Pause scan
              </button>
            ) : (
              <button type="button" className="button" onClick={tuner.resume}>
                ▶ {tuner.mode === "done" ? "Scan again" : "Resume scan"}
              </button>
            )}
            <button type="button" className="button" aria-pressed={sound.enabled} onClick={sound.toggle}>
              {sound.enabled ? "🔊 Sound on" : "🔈 Sound off"}
            </button>
          </div>
          {sound.enabled && <p className="si-note">Sound effects are for fun: space itself is silent.</p>}
        </aside>
      </div>

      <TuneDial
        world={world}
        stations={tuner.sorted}
        min={min}
        max={max}
        needle={tuner.needle}
        strength={tuner.strength}
        lockedId={tuner.lockedId}
        scanning={scanning}
        onTune={tuner.tune}
        onRelease={release}
        onSelect={select}
        onStep={tuner.step}
      />
      <p className="dial-legend">
        {world === "beyond" ? "On this dial, each explorer sits at its launch year." : "On this dial, each explorer sits at its longitude on the map."} Drag the
        needle, or use the arrow keys, to tune.
      </p>
    </section>
  );
}
