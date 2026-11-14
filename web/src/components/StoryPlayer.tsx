import { useEffect, useRef, useState } from "react";
import { formatDate } from "../lib/data";
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

  useEffect(() => {
    try {
      localStorage.setItem(LEVEL_KEY, level);
    } catch {
      /* private mode: level just isn't remembered */
    }
  }, [level]);

  const go = (n: number) => {
    audio.current?.pause();
    setStep(Math.max(0, Math.min(total, n)));
    requestAnimationFrame(() => heading.current?.focus());
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
          {beat.key === "how" && story.interaction && <Interaction kind={story.interaction} />}

          {hasAudio && (
            <div className="narration">
              <audio ref={audio} key={`${level}-${beat.key}`} controls preload="none" src={`${mediaBase}/media/audio/${artifact.id}/${level}-${beat.key}.mp3`}>
                Your browser cannot play this narration; the story text above is the same.
              </audio>
              <p className="si-note">Narration voice is computer-generated.</p>
            </div>
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
        <Postcard artifact={artifact} message={story.postcard} />
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
