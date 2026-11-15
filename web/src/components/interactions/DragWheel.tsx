import { useCallback, useEffect, useRef, useState } from "react";
import { labText, roverLoop, sparkle, useLabVoice, useLoop } from "../../lib/labSound";

const W = 600;
const H = 200;
const START_X = 520;
const END_X = 70;
const SPEED = 60; // px per second while driving: slow enough to watch the trench and hear the narrator
const WHEEL_Y = 62; // the broken wheel's track (top side of the rover, seen from above)
const SILICA = { x0: 230, x1: 360 }; // where the bright soil hides under the dust (illustrative)
const BROKEN_DX = 46; // the broken wheel sits at the rover's back right; the trench starts there

/** Drive Spirit with its broken wheel dragging; the trench it digs uncovers bright silica. Top-down, not to scale. */
export default function DragWheel({ mediaBase = "", onStart }: { mediaBase?: string; onStart?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const soil = useRef<HTMLCanvasElement | null>(null);
  const [x, setX] = useState(START_X);
  const [driving, setDriving] = useState(false);
  const wheelX = x + BROKEN_DX;
  const found = wheelX <= SILICA.x1 - (SILICA.x1 - SILICA.x0) * 0.4;
  const done = x <= END_X;
  const voice = useLabVoice(mediaBase);
  const engine = useLoop(roverLoop);

  // Motors whir while driving; the grind brightens once the wheel is in the silica.
  useEffect(() => engine.set(driving && !done, found ? 1 : 0), [engine, driving, done, found]);

  // The narrator speaks at each turn of the drive, so you know what to look for and when it's over.
  const wasFound = useRef(found);
  useEffect(() => {
    if (found && !wasFound.current) {
      // A discovery stop: the rover halts while the narrator explains, then you drive on.
      setDriving(false);
      sparkle();
      voice.say("wheel-found");
    }
    wasFound.current = found;
  }, [found]);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) voice.say("wheel-parked");
    wasDone.current = done;
  }, [done]);

  const begin = () => {
    onStart?.();
    voice.say("wheel-start", { once: true });
  };

  // Speckled red soil, generated once.
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#b8653b";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = Math.random() < 0.5 ? "#a3532d" : "#c97a4e";
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    soil.current = c;
  }, []);

  const draw = useCallback(() => {
    const g = canvas.current?.getContext("2d");
    if (!g || !soil.current) return;
    g.drawImage(soil.current, 0, 0);

    // Tracks from the five good wheels (faint) and the trench from the dragged wheel.
    const from = x + BROKEN_DX;
    const to = START_X + BROKEN_DX;
    g.fillStyle = "#8a4423aa";
    for (const y of [WHEEL_Y, H - WHEEL_Y]) g.fillRect(from, y - 6, to - from, 12);
    for (let px = from; px < to; px += 2) {
      const bright = px >= SILICA.x0 && px <= SILICA.x1;
      g.fillStyle = bright ? "#f6f2e6" : "#6a3014";
      g.fillRect(px, WHEEL_Y - 5, 2, 10);
    }

    // Rover body and wheels (front faces right; it moves left with the broken wheel dragging).
    g.fillStyle = "#d9dde8";
    g.fillRect(x - 40, WHEEL_Y + 8, 90, H - 2 * WHEEL_Y - 16);
    g.fillStyle = "#3a4058";
    g.fillRect(x - 30, WHEEL_Y + 22, 70, H - 2 * WHEEL_Y - 44);
    for (const wx of [x - 36, x + 5, x + BROKEN_DX]) {
      for (const wy of [WHEEL_Y, H - WHEEL_Y]) {
        const broken = wy === WHEEL_Y && wx === x + BROKEN_DX;
        g.fillStyle = broken ? "#ff5c7a" : "#22263a";
        g.fillRect(wx - 9, wy - 8, 18, 16);
      }
    }
  }, [x]);

  useEffect(draw, [draw]);

  useEffect(() => {
    if (!driving || done) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const dt = (now - last) / 1000;
      last = now;
      setX((v) => Math.max(END_X, v - SPEED * dt));
      raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [driving, done]);

  const hold = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId); // a finger sliding off the button keeps driving
      begin();
      setDriving(true);
    },
    onPointerUp: () => setDriving(false),
    onPointerLeave: () => setDriving(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        begin();
        setX((v) => Math.max(END_X, v - 24));
      }
    },
  };

  return (
    <div className="lab">
      <p className="lab-title">Hands-on: drive with a broken wheel</p>
      <canvas
        ref={canvas}
        width={W}
        height={H}
        className="lab-canvas"
        role="img"
        aria-label="Spirit seen from above on red Martian soil. Its broken wheel, shown in pink, drags behind and digs a trench."
      />
      <div className="lab-row">
        <button type="button" className="button primary" disabled={done} {...hold}>
          {done ? "Parked" : "Hold to drive"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            voice.stop();
            setX(START_X);
          }}
          disabled={x === START_X}
        >
          Start again
        </button>
      </div>
      <div className="lab-result" aria-live="polite">
        <p>{labText(done ? "wheel-parked" : found ? "wheel-found" : "wheel-start")}</p>
      </div>
      <p className="lab-foot">Seen from above, not to scale. Keyboard: press Space or Enter on the drive button to move a little at a time.</p>
    </div>
  );
}
