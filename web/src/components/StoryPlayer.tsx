import { useEffect, useRef, useState } from "react";
import { formatDate } from "../lib/data";
import { soundOn } from "../lib/sound";
import type { Artifact, LevelId, Story } from "../lib/types";
import Interaction from "./interactions/Interaction";
import Postcard from "./Postcard";
import StatusChip from "./StatusChip";

const LEVELS: Record<LevelId, string> = { younger: "Ages 9–11", older: "Ages 12–14" };
const LEVEL_KEY = "mm-level";

function savedLevel(): LevelId {
  try {
    return localStorage.getItem(LEVEL_KEY) === "older" ? "older" : "younger";
  } catch {
    return "younger";
  }
}

interface Props {
  artifact: Artifact;
  story: Story;
  /** Prefix for media URLs ("" on the site, the public origin inside MCP hosts). */
  mediaBase?: string;
}

/** The 5-beat story told by the explorer, then its postcard. Router-free so it also runs inside MCP hosts. */
export default function StoryPlayer({ artifact, story, mediaBase = "" }: Props) {
  const [level, setLevel] = useState<LevelId>(savedLevel);
  const [step, setStep] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const total = story.beats.length; // the postcard is step `total`
  const beat = story.beats[step];
  const hasAudio = story.audio?.includes(level) ?? false;
  // "Play story": narrate each chapter and move on by itself, pausing at hands-on moments.
  // With sound on, the story starts telling itself (the browser may still need a first tap).
  const [listening, setListening] = useState(() => (story.audio?.includes(savedLevel()) ?? false) && soundOn());
  const [yourTurn, setYourTurn] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LEVEL_KEY, level);
    } catch {
      /* private mode: level just isn't remembered */
    }
  }, [level]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (!listening) return a.pause();
    a.currentTime = 0;
    a.play().catch(() => setListening(false)); // e.g. blocked by the browser
  }, [listening, step, level]);

  const go = (n: number) => {
    audio.current?.pause();
    setYourTurn(false);
    setStep(Math.max(0, Math.min(total, n)));
    requestAnimationFrame(() => heading.current?.focus());
  };

  const onEnded = () => {
    if (!listening) return;
    if (beat?.key === "how" && story.interaction) {
      setListening(false);
      setYourTurn(true);
    } else if (step < total - 1) {
      go(step + 1);
    } else {
      setListening(false);
      go(total);
    }
  };

  return (
    <article className="player" onKeyDown={(e) => {
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLElement && e.target.tagName === "SUMMARY") return;
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft") go(step - 1);
    }}>
      <header className="player-head">
        <p className="panel-kicker">{artifact.body}</p>
        <h1>{artifact.name}</h1>
        <StatusChip status={artifact.status} note={artifact.statusNote} />
        <p className="player-dates">
          {/* One launch date would be wrong for a ghost spread over several missions (the retroreflectors). */}
          {artifact.launched && !artifact.sites.length && <>Launched {formatDate(artifact.launched)}</>}
          {artifact.sites.length > 0 && <>Placed at {artifact.sites.length} sites</>}
          {artifact.lastContact && <> · Last contact {formatDate(artifact.lastContact)}</>}
        </p>
        <div className="level-switch" role="radiogroup" aria-label="Reading level">
          {(Object.keys(LEVELS) as LevelId[]).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={level === l} className={level === l ? "on" : ""} onClick={() => setLevel(l)}>
              {LEVELS[l]}
            </button>
          ))}
        </div>
        {hasAudio && (
          <button
            type="button"
            className={`button play-story${listening ? " on" : ""}`}
            aria-pressed={listening}
            onClick={() => {
              if (yourTurn) {
                // After a hands-on moment, carry on with the next chapter rather than replaying this one.
                go(step + 1);
                setListening(true);
                return;
              }
              if (step === total) go(0);
              setListening((v) => !v);
            }}
          >
            {listening ? "❚❚ Pause story" : step === 0 ? "▶ Play story" : "▶ Keep listening"}
          </button>
        )}
        {hasAudio && <p className="si-note">Told by a computer-generated voice.</p>}
      </header>

      <ol className="beat-steps" aria-label="Story chapters">
        {story.beats.map((b, i) => (
          <li key={b.key}>
            <button type="button" className={i === step ? "on" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined} onClick={() => go(i)}>
              <span className="beat-num">{i + 1}</span>
              <span className="beat-name">{b.title}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={step === total ? "on" : ""} aria-current={step === total ? "step" : undefined} onClick={() => go(total)}>
            <span className="beat-num">✉</span>
            <span className="beat-name">Postcard</span>
          </button>
        </li>
      </ol>

      {beat ? (
        <section className="beat" aria-live="polite">
          <h2 ref={heading} tabIndex={-1}>
            {beat.title}
          </h2>
          <p className="beat-text">{beat.text[level]}</p>
          {beat.image && (
            <figure className="beat-figure">
              <img src={`${mediaBase}${beat.image.src}`} alt={beat.image.alt} loading="lazy" />
              <figcaption>
                {beat.image.illustration && <span className="tag">Illustration</span>} {beat.image.caption}{" "}
                <a href={beat.image.url} target="_blank" rel="noreferrer" className="credit">
                  {beat.image.credit}
                </a>
              </figcaption>
            </figure>
          )}
          {yourTurn && (
            <p className="your-turn" role="status">
              Your turn! Try it below, then press <strong>Keep listening</strong> or <strong>Next</strong>.
            </p>
          )}
          {beat.key === "how" && story.interaction && <Interaction kind={story.interaction} />}

          {/* The narrator: no player on screen, driven by the Play story button. */}
          {hasAudio && (
            <audio
              ref={audio}
              key={`${level}-${beat.key}`}
              preload="auto"
              onEnded={onEnded}
              src={`${mediaBase}/media/audio/${artifact.id}/${level}-${beat.key}.mp3`}
            />
          )}

          <details className="sources">
            <summary>What NASA says ({beat.sources.length})</summary>
            <ul>
              {beat.sources.map((s, i) => (
                <li key={i}>
                  <q>{s.quote}</q>{" "}
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : (
        <Postcard artifact={artifact} message={story.postcard} origin={mediaBase} />
      )}

      <nav className="player-nav" aria-label="Story navigation">
        <button type="button" className="button" disabled={step === 0} onClick={() => go(step - 1)}>
          ← Back
        </button>
        <span className="player-progress">
          {Math.min(step + 1, total + 1)} / {total + 1}
        </span>
        <button type="button" className="button primary" disabled={step === total} onClick={() => go(step + 1)}>
          {step === total - 1 ? "Get my postcard →" : "Next →"}
        </button>
      </nav>

      {story.reviewStatus !== "approved" && <p className="review-flag">Draft: this story is still being fact-checked.</p>}
      <p className="si-note">Story text drafted with computer assistance from the NASA sources above, then fact-checked by our team.</p>
    </article>
  );
}
