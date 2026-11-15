import { useEffect, useRef, useState } from "react";
import { formatDate } from "../lib/data";
import { logHeard } from "../lib/missionLog";
import { NARRATOR_CPS, soundOn } from "../lib/sound";
import type { Artifact, LevelId, Story } from "../lib/types";
import Interaction from "./interactions/Interaction";
import { useLightbox } from "./Lightbox";
import Postcard from "./Postcard";
import StatusChip from "./StatusChip";
import Typewriter from "./Typewriter";

// Depth, not age: everyone starts with the story; anyone curious can switch to more detail.
const LEVELS: Record<LevelId, string> = { younger: "Story", older: "🔭 More detail" };
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
  // Cards slide in from the side you're heading to, like a presentation.
  const [dir, setDir] = useState<"next" | "prev">("next");
  // Each chapter types itself out the first time it opens (per detail level), so the story is easy to follow.
  const seen = useRef<Set<string> | null>(null);
  const [typing, setTyping] = useState<string | null>(() => `${level}-${story.beats[0]?.key}`);
  seen.current ??= new Set(typing ? [typing] : []);
  const reveal = (lvl: LevelId, n: number) => {
    const b = story.beats[n];
    if (!b) return;
    const k = `${lvl}-${b.key}`;
    setTyping(seen.current!.has(k) ? null : k);
    seen.current!.add(k);
  };
  const lightbox = useLightbox();
  const audio = useRef<HTMLAudioElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const total = story.beats.length; // the postcard is step `total`
  const beat = story.beats[step];
  const hasAudio = story.audio?.includes(level) ?? false;
  // "Play story": narrate each chapter and move on by itself, pausing at hands-on moments.
  // With sound on, the story starts telling itself (the browser may still need a first tap).
  const [listening, setListening] = useState(() => (story.audio?.includes(savedLevel()) ?? false) && soundOn());
  const [yourTurn, setYourTurn] = useState(false);
  // Set when the visitor starts a hands-on moment mid-chapter; "Keep listening" then moves on.
  const playedLab = useRef(false);

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
    const to = Math.max(0, Math.min(total, n));
    audio.current?.pause();
    setYourTurn(false);
    playedLab.current = false;
    setDir(to >= step ? "next" : "prev");
    reveal(level, to);
    setStep(to);
    requestAnimationFrame(() => heading.current?.focus());
  };

  // Reaching the postcard means the whole story was heard: a star in the Mission Log.
  useEffect(() => {
    if (step === total) logHeard(artifact.id);
  }, [step, total, artifact.id]);

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
        <div className="level-switch" role="radiogroup" aria-label="How much detail">
          {(Object.keys(LEVELS) as LevelId[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              className={level === l ? "on" : ""}
              onClick={() => {
                if (l === level) return;
                reveal(l, step);
                setLevel(l);
              }}
            >
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
              if (yourTurn || playedLab.current) {
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
        {hasAudio && <p className="si-note">SI voice.</p>}
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
        <section key={step} className={`beat card-in from-${dir}`} aria-live="polite">
          <h2 ref={heading} tabIndex={-1}>
            {beat.title}
          </h2>
          {typing === `${level}-${beat.key}` ? (
            // Tap to show the whole chapter at once.
            // An invisible copy holds the full height, so the photo below doesn't jump as lines appear.
            <p className="beat-text typing" onClick={() => setTyping(null)} title="Tap to show it all">
              <span className="typing-space" aria-hidden="true">
                {beat.text[level]}
              </span>
              <span className="typing-text">
                <Typewriter key={typing} text={beat.text[level]} cps={listening ? NARRATOR_CPS : 40} />
              </span>
            </p>
          ) : (
            <p className="beat-text">{beat.text[level]}</p>
          )}
          {beat.image && (
            <figure className="beat-figure">
              {/* Tap or click to see the NASA photo full screen, and zoom in on the explorer. */}
              <button
                type="button"
                className="figure-zoom"
                aria-label={`Open larger: ${beat.image.alt}`}
                onClick={(e) => lightbox.open({ ...beat.image!, src: `${mediaBase}${beat.image!.src}` }, e.currentTarget)}
              >
                <img src={`${mediaBase}${beat.image.src}`} alt={beat.image.alt} loading="lazy" />
                <span className="figure-zoom-hint" aria-hidden="true">
                  ⤢
                </span>
              </button>
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
          {beat.key === "how" && story.interaction && (
            <Interaction
              kind={story.interaction}
              mediaBase={mediaBase}
              onStart={() => {
                // The hands-on moment has its own voice: pause the story while you play.
                // (No notice appears: shifting the layout would slide the button out from under a held finger.)
                playedLab.current = true;
                setListening(false);
              }}
            />
          )}

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
        <div key="postcard" className="postcard-stage">
          <Postcard artifact={artifact} message={story.postcard} origin={mediaBase} />
        </div>
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
      {lightbox.viewer}
    </article>
  );
}
