import { useEffect, useRef, useState } from "react";

// Radio-receiver sound effects, synthesized live with the Web Audio API (no audio files).
// Static fades as the signal strengthens, a carrier tone hums when locked, and a chirp marks each find.
// Artistic only: space itself is silent.

const KEY = "mm-sound";

interface Rig {
  ctx: AudioContext;
  noise: GainNode;
  tone: GainNode;
}

function savedPref(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

function build(): Rig {
  const ctx = new AudioContext();

  // Looping white noise through a band-pass filter: radio static.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1400;
  band.Q.value = 0.6;
  const noise = ctx.createGain();
  noise.gain.value = 0;
  src.connect(band).connect(noise).connect(ctx.destination);
  src.start();

  // A soft carrier tone with a slow warble, heard as a station comes in.
  const osc = ctx.createOscillator();
  osc.frequency.value = 660;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5;
  const depth = ctx.createGain();
  depth.gain.value = 6;
  lfo.connect(depth).connect(osc.frequency);
  const tone = ctx.createGain();
  tone.gain.value = 0;
  osc.connect(tone).connect(ctx.destination);
  osc.start();
  lfo.start();

  return { ctx, noise, tone };
}

function chirp(ctx: AudioContext, freq: number, at: number) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.12);
}

export function useRadioSound(strength: number, lockedId: string | null) {
  const [enabled, setEnabled] = useState(savedPref);
  const rig = useRef<Rig | null>(null);

  const start = () => {
    rig.current ??= build();
    void rig.current.ctx.resume();
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      /* not remembered in private mode */
    }
    if (next) start();
    else void rig.current?.ctx.suspend();
  };

  // Browsers only allow sound after a user gesture: if sound was left on, start at the first one.
  useEffect(() => {
    if (!enabled || rig.current) return;
    const go = () => start();
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
  }, [enabled]);

  useEffect(() => {
    const r = rig.current;
    if (!r) return;
    const t = r.ctx.currentTime;
    r.noise.gain.setTargetAtTime(enabled ? (1 - strength) * 0.08 : 0, t, 0.08);
    r.tone.gain.setTargetAtTime(enabled ? strength * strength * 0.03 : 0, t, 0.1);
  });

  useEffect(() => {
    const r = rig.current;
    if (!r || !enabled || !lockedId) return;
    chirp(r.ctx, 1320, 0);
    chirp(r.ctx, 1760, 0.13);
  }, [lockedId, enabled]);

  useEffect(
    () => () => {
      void rig.current?.ctx.close();
      rig.current = null;
    },
    [],
  );

  return { enabled, toggle };
}
