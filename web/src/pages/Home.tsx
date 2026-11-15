import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { LogoMark } from "../components/Logo";
import Typewriter from "../components/Typewriter";
import { WORLDS, byWorld } from "../lib/data";
import { useMissionLog } from "../lib/missionLog";
import { NARRATOR_CPS, soundOn } from "../lib/sound";
import { useArtifacts, useStories } from "../lib/useArtifacts";
import type { WorldId } from "../lib/types";

const STARTED = "mm-started";

function startedThisVisit(): boolean {
  try {
    return sessionStorage.getItem(STARTED) === "1";
  } catch {
    return false;
  }
}

export default function Home() {
  const { index } = useArtifacts();
  const { stories } = useStories();
  const log = useMissionLog();
  const [started, setStarted] = useState(startedThisVisit);
  const [speaking, setSpeaking] = useState(false);
  const voice = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => voice.current?.pause(), []);

  // One tap starts the mission: it also unlocks sound for the rest of the visit.
  const start = () => {
    try {
      sessionStorage.setItem(STARTED, "1");
    } catch {
      /* fine: the intro just shows again next time */
    }
    setStarted(true);
    if (!soundOn()) return;
    voice.current?.pause();
    const a = new Audio("/media/audio/site/welcome.mp3");
    voice.current = a;
    a.addEventListener("ended", () => setSpeaking(false));
    a.play()
      .then(() => setSpeaking(true))
      .catch(() => setSpeaking(false));
  };

  const total = index?.artifacts.length ?? 0;

  return (
    <section className={`home${started ? " started" : ""}`}>
      <div className="home-hero">
        <div className="home-mark tuning" aria-hidden="true">
          <LogoMark size={112} />
        </div>
        <h1>The explorers NASA left behind are still out there.</h1>
        {!started ? (
          <>
            <p className="home-sub">Tune in, and they'll tell you their stories.</p>
            <button type="button" className="button primary start" onClick={start}>
              ▶ Start the mission
            </button>
            <p className="home-note">Free · no sign-up · sound on · built from NASA open data</p>
          </>
        ) : (
          <p className="home-sub home-welcome" aria-live="polite">
            <span className="home-mc">Mission Control:</span> <Typewriter text={stories?.lines?.welcome ?? ""} cps={speaking ? NARRATOR_CPS : 60} />
          </p>
        )}
      </div>

      {started && (
        <>
          <ul className="worlds">
            {(Object.keys(WORLDS) as WorldId[]).map((id, i) => {
              const ghosts = index ? byWorld(index, id) : [];
              const faces = ghosts.filter((g) => g.tier !== "map").slice(0, 3);
              return (
                <li key={id} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                  <Link to={`/world/${id}`} className={`world-card world-${id}`}>
                    <span className={`planet planet-${id}`} aria-hidden="true" />
                    <span className="world-name">{WORLDS[id].name}</span>
                    <span className="world-tag">{WORLDS[id].tagline}</span>
                    <span className="world-faces" aria-hidden="true">
                      {faces.map((g) => stories?.portraits?.[g.id] && <img key={g.id} src={stories.portraits[g.id].src} alt="" />)}
                      <em>{ghosts.length} explorers</em>
                    </span>
                    <span className="world-go">Tune in ▶</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="home-log">
            <Link to="/log">
              📡 Mission Log: {log.found.length} of {total} explorers found
            </Link>
            <button type="button" className="linklike" onClick={start}>
              ↻ Replay welcome
            </button>
          </p>
        </>
      )}
    </section>
  );
}
