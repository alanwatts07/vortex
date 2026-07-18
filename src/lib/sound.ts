// Tiny Web Audio synth — no assets. Sounds only play after a user gesture has
// unlocked the AudioContext (call unlockAudio on tap), per browser autoplay rules.

type MaybeWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as MaybeWebkit).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a user gesture (e.g. flipping your light on) to enable sound. */
export function unlockAudio() {
  getCtx();
}

function tone(
  c: AudioContext,
  freq: number,
  dur: number,
  when: number,
  peak: number,
  glideTo?: number,
) {
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** A soft sonar "blip" — when a new light appears on the radar. */
export function blipSound() {
  const c = getCtx();
  if (!c) return;
  tone(c, 880, 0.2, 0, 0.05, 520);
}

/** A brighter two-note chime — when someone reaches out to you. */
export function pingSound() {
  const c = getCtx();
  if (!c) return;
  tone(c, 587.33, 0.16, 0, 0.08);
  tone(c, 880, 0.24, 0.12, 0.08);
}
