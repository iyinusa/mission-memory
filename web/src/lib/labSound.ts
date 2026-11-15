import { useEffect, useRef, useState } from "react";
import { soundOn } from "./sound";
import LINES from "./labLines.json";

// Sound for the hands-on moments: effects synthesized live with the Web Audio API (no files),
// and the narrator reading each on-screen message. Artistic only: space itself is silent.

export type LabLine = Exclude<keyof typeof LINES, "_comment">;
export const labText = (key: LabLine): string => LINES[key];

let shared: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** The shared audio context, or null when sound is off. Labs only call this after a tap, so browsers allow it. */
function ctx(): AudioContext | null {
  if (!soundOn()) return null;
  try {
    shared ??= new AudioContext();
  } catch {
    return null;
  }
  if (shared.state === "suspended") void shared.resume();
  return shared;
}

function noiseSource(c: AudioContext): AudioBufferSourceNode {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  return s;
}

function blip(c: AudioContext, freq: number, at: number, length: number, peak: number, type: OscillatorType = "sine") {
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + length + 0.02);
}

/** A falling "pew" as the laser fires. */
export function laserZap() {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(2400, t);
  o.frequency.exponentialRampToValueAtTime(240, t + 0.38);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 3200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.45);
}

/** A sonar-like ping when the light returns. */
export function ping() {
  const c = ctx();
  if (!c) return;
  blip(c, 1568, 0, 0.5, 0.08);
  blip(c, 2093, 0.09, 0.7, 0.06);
}

/** A rising sparkle for a discovery or a milestone. */
export function sparkle() {
  const c = ctx();
  if (!c) return;
  [880, 1109, 1319, 1760].forEach((f, i) => blip(c, f, i * 0.07, 0.35, 0.05, "triangle"));
}

export interface Loop {
  /** Turn the sound on or off; `level` (0 to 1) shapes it (how hard the wheel grinds, how fast Dawn goes). */
  set(on: boolean, level?: number): void;
  stop(): void;
}

function makeLoop(build: (c: AudioContext, out: GainNode) => { level(v: number, t: number): void; nodes: AudioScheduledSourceNode[] }): Loop {
  let rig: { c: AudioContext; out: GainNode; level(v: number, t: number): void; nodes: AudioScheduledSourceNode[] } | null = null;
  return {
    set(on, level = 0) {
      if (on && !rig) {
        const c = ctx();
        if (!c) return;
        const out = c.createGain();
        out.gain.value = 0;
        out.connect(c.destination);
        const built = build(c, out);
        built.nodes.forEach((n) => n.start());
        rig = { c, out, ...built };
      }
      if (!rig) return;
      const t = rig.c.currentTime;
      rig.out.gain.setTargetAtTime(on && soundOn() ? 1 : 0, t, on ? 0.05 : 0.12);
      rig.level(level, t);
    },
    stop() {
      if (!rig) return;
      const { c, out, nodes } = rig;
      out.gain.setTargetAtTime(0, c.currentTime, 0.05);
      setTimeout(() => nodes.forEach((n) => n.stop()), 300);
      rig = null;
    },
  };
}

/** Spirit's motors whirring, and the dead wheel grinding through the soil. */
export function roverLoop(): Loop {
  return makeLoop((c, out) => {
    const motor = c.createOscillator();
    motor.type = "sawtooth";
    motor.frequency.value = 62;
    const warble = c.createOscillator();
    warble.frequency.value = 7;
    const depth = c.createGain();
    depth.gain.value = 4;
    warble.connect(depth).connect(motor.frequency);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const motorGain = c.createGain();
    motorGain.gain.value = 0.05;
    motor.connect(lp).connect(motorGain).connect(out);

    const grit = noiseSource(c);
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900;
    band.Q.value = 0.9;
    const gritGain = c.createGain();
    gritGain.gain.value = 0.04;
    const crunch = c.createOscillator(); // uneven scraping
    crunch.type = "square";
    crunch.frequency.value = 11;
    const crunchDepth = c.createGain();
    crunchDepth.gain.value = 0.025;
    crunch.connect(crunchDepth).connect(gritGain.gain);
    grit.connect(band).connect(gritGain).connect(out);
    return {
      nodes: [motor, warble, grit, crunch],
      level: (v, t) => band.frequency.setTargetAtTime(900 + v * 900, t, 0.1), // brighter grind in the silica
    };
  });
}

/** Dawn's ion engine: a soft electric hum and hiss that climb as speed builds. */
export function ionLoop(): Loop {
  return makeLoop((c, out) => {
    const hum = c.createOscillator();
    hum.type = "triangle";
    hum.frequency.value = 90;
    const humGain = c.createGain();
    humGain.gain.value = 0.05;
    hum.connect(humGain).connect(out);
    const hiss = noiseSource(c);
    const hp = c.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 2400;
    hp.Q.value = 1.4;
    const hissGain = c.createGain();
    hissGain.gain.value = 0.03;
    hiss.connect(hp).connect(hissGain).connect(out);
    return {
      nodes: [hum, hiss],
      level: (v, t) => {
        hum.frequency.setTargetAtTime(90 + v * 170, t, 0.2);
        hp.frequency.setTargetAtTime(2400 + v * 2600, t, 0.2);
      },
    };
  });
}

/** Keeps one loop for the component's lifetime and silences it on unmount. */
export function useLoop(make: () => Loop): Loop {
  const loop = useRef<Loop | null>(null);
  loop.current ??= make();
  useEffect(() => () => loop.current?.stop(), []);
  return loop.current;
}

/**
 * The narrator for a hands-on moment: `say(key)` speaks that line (queued after any line still playing).
 * `once` lines are spoken only the first time.
 */
export function useLabVoice(mediaBase = "") {
  const queue = useRef<LabLine[]>([]);
  const current = useRef<HTMLAudioElement | null>(null);
  const said = useRef(new Set<LabLine>());
  const [speaking, setSpeaking] = useState(false);

  const next = () => {
    const key = queue.current.shift();
    if (!key) {
      current.current = null;
      setSpeaking(false);
      return;
    }
    const a = new Audio(`${mediaBase}/media/audio/labs/${key}.mp3`);
    current.current = a;
    let finished = false;
    const done = () => {
      if (finished || current.current !== a) return; // already moved on, or stopped
      finished = true;
      next();
    };
    a.onended = done;
    a.onerror = done;
    a.play()
      .then(() => setSpeaking(true))
      .catch(done);
  };

  const stop = () => {
    queue.current = [];
    if (current.current) {
      current.current.onended = current.current.onerror = null;
      current.current.pause();
    }
    current.current = null;
    setSpeaking(false);
  };

  const say = (key: LabLine, opts: { once?: boolean; interrupt?: boolean } = {}) => {
    if (opts.once && said.current.has(key)) return;
    said.current.add(key);
    if (!soundOn()) return;
    if (opts.interrupt) stop();
    queue.current.push(key);
    if (!current.current) next();
  };

  useEffect(() => stop, []);
  return { say, stop, speaking };
}
