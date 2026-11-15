import { lazy, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { WORLDS, dialValue } from "../lib/data";
import { logFound } from "../lib/missionLog";
import { NARRATOR_CPS } from "../lib/sound";
import { useNarrator } from "../lib/useNarrator";
import { useRadioSound, useSoundSwitch } from "../lib/useRadioSound";
import { useTuner, type Station } from "../lib/useTuner";
import type { Artifact, BeatImage, StoryIndex, WorldId } from "../lib/types";
import BeyondMap from "./BeyondMap";
import Loading from "./Loading";
import StatusChip from "./StatusChip";
import TuneDial from "./TuneDial";
import Typewriter from "./Typewriter";
import ZoomPhoto from "./ZoomBubble";

// three.js only loads on the globe worlds.
const Globe = lazy(() => import("./Globe"));

interface Props {
  world: WorldId;
  ghosts: Artifact[];
  stories: StoryIndex;
  /** Prefix for media URLs ("" on the site, the public origin inside MCP hosts). */
  mediaBase?: string;
  /** Land on this explorer instead of starting the scan (e.g. coming back from its story). */
  startId?: string | null;
  /** Called when the visitor picks an explorer (dial, globe, map or keys). */
  onPick?: (id: string) => void;
  /** The button that opens the locked explorer's story: a link on the site, a view switch in MCP hosts. */
  open: (ghost: Artifact) => ReactNode;
}

/** The Tune In radio for one world: dial, globe (or Beyond map) and the panel of what it finds. Router-free so it also runs inside MCP hosts. */
export default function WorldTuner({ world, ghosts, stories, mediaBase = "", startId = null, onPick, open }: Props) {
  const stations: Station[] = useMemo(
    () => ghosts.map((g) => ({ id: g.id, name: g.name, value: dialValue(g), status: g.status, strong: g.tier !== "map" })),
    [ghosts],
  );
  const [min, max] = useMemo(() => {
    if (world !== "beyond") return [-180, 180];
    const v = stations.map((s) => s.value);
    return [Math.floor(Math.min(...v) / 5) * 5 - 2, Math.ceil(Math.max(...v) / 5) * 5 + 2];
  }, [world, stations]);
  // Photos load from the public origin when embedded in an MCP host.
  const portraits = useMemo(() => {
    if (!mediaBase || !stories.portraits) return stories.portraits;
    const at = (p: BeatImage): BeatImage => ({ ...p, src: `${mediaBase}${p.src}`, full: p.full && `${mediaBase}${p.full}` });
    return Object.fromEntries(Object.entries(stories.portraits).map(([id, p]) => [id, at(p)]));
  }, [mediaBase, stories.portraits]);

  // A fresh visit starts the scan; `startId` lands on that explorer.
  const tuner = useTuner(stations, min, max, startId);
  const locked = ghosts.find((g) => g.id === tuner.lockedId) ?? null;
  const scanning = tuner.mode === "scan";
  // When a signal locks, the explorer speaks: its first story line, or NASA's summary for map-only explorers.
  const story = locked ? stories.stories[locked.id] : undefined;
  const portrait = locked ? portraits?.[locked.id] : undefined;
  const clip = !locked
    ? null
    : story?.audio?.includes("younger")
      ? `${mediaBase}/media/audio/${locked.id}/younger-why.mp3`
      : stories.summaryAudio?.includes(locked.id)
        ? `${mediaBase}/media/audio/${locked.id}/summary.mp3`
        : null;
  const sound = useSoundSwitch();
  const narrator = useNarrator(clip, sound.enabled, (seconds) => {
    // Let the narrator finish before the scan moves on.
    if (tuner.mode === "scan") tuner.hold(seconds * 1000 + 1200);
  });
  useRadioSound(sound.enabled, tuner.strength, tuner.lockedId, narrator.speaking);
  // Tuning to an explorer yourself puts it in the Mission Log (the automatic scan alone doesn't).
  useEffect(() => {
    if (tuner.lockedId && tuner.mode !== "scan") logFound(tuner.lockedId);
  }, [tuner.lockedId, tuner.mode]);

  const select = (id: string) => {
    tuner.select(id);
    onPick?.(id);
  };
  const release = (v: number) => tuner.release(v);
  const intro = locked ? (stories.stories[locked.id]?.beats[0]?.text.younger ?? locked.summary) : "";

  return (
    <section className="world">
      {/* Title on the left, the tuner on the right (stacked on phones). */}
      <div className="world-top">
        <header className="world-head">
          <h1>{WORLDS[world].name}</h1>
          <p className="lede">{WORLDS[world].tagline}</p>
        </header>
        <div className="world-tuner">
          {/* The tuner sits above the view, like a radio's display: what it finds appears below. */}
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
            controls={
              <>
                {scanning ? (
                  <button type="button" className="button small" onClick={tuner.pause}>
                    ❚❚ Pause
                  </button>
                ) : (
                  <button type="button" className="button small" onClick={tuner.resume}>
                    ▶ {tuner.mode === "done" ? "Scan again" : "Scan"}
                  </button>
                )}
                <button
                  type="button"
                  className="button small"
                  aria-pressed={sound.enabled}
                  aria-label={sound.enabled ? "Sound on" : "Sound off"}
                  title={sound.enabled ? "Sound on (effects are for fun: space itself is silent)" : "Sound off"}
                  onClick={sound.toggle}
                >
                  {sound.enabled ? "🔊" : "🔈"}
                </button>
              </>
            }
          />
          <p className="dial-legend">
            {world === "beyond" ? "Each explorer sits at its launch year." : "Each explorer sits at its longitude."} Drag the needle or the{" "}
            {world === "beyond" ? "map" : "globe"}, or use the arrow keys, to tune.{sound.enabled && " Sound effects are for fun: space itself is silent."}
          </p>
        </div>
      </div>

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
              portraits={portraits}
              onTune={tuner.tune}
              onRelease={release}
            />
          ) : (
            <Suspense fallback={<Loading label="Warming up the telescope…" />}>
              <Globe
                world={world}
                ghosts={ghosts}
                needle={tuner.needle}
                lockedId={tuner.lockedId}
                portraits={portraits}
                mediaBase={mediaBase}
                onSelect={select}
                onTune={tuner.tune}
                onRelease={release}
              />
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
              <div className="panel-title">
                {portrait && <ZoomPhoto photo={portrait} className="panel-photo" />}
                <h2>{locked.name}</h2>
              </div>
              {portrait && (
                <p className="panel-credit">
                  {portrait.illustration && <span className="tag">Illustration</span>} {portrait.caption}{" "}
                  <a href={portrait.url} target="_blank" rel="noreferrer">
                    {portrait.credit}
                  </a>
                </p>
              )}
              <StatusChip status={locked.status} note={locked.statusNote} />
              {/* An invisible copy holds the full height, so the panel (and an MCP host's card) doesn't grow line by line. */}
              <p className="panel-summary typing-box">
                <span className="typing-space" aria-hidden="true">
                  {intro}
                </span>
                <span>
                  <Typewriter key={locked.id} text={intro} cps={narrator.speaking ? NARRATOR_CPS : 38} />
                </span>
              </p>
              {open(locked)}
            </>
          ) : (
            <div className="panel-static">
              <p className="panel-kicker">{scanning ? "Scanning" : "Static"}</p>
              <h2>{scanning ? "Listening for explorers…" : "Nothing on this frequency"}</h2>
              <p className="panel-summary">{scanning ? "Searching for a signal…" : "Drag the dial, or tap a glowing dot."}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
