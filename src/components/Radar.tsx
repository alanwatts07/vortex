"use client";

import { useEffect, useRef } from "react";

export type Blip = {
  /** angle in radians, 0 = east, increasing counter-clockwise */
  angle: number;
  /** normalized distance from center, 0..1 */
  dist: number;
  /** slow angular drift, radians per second */
  drift: number;
  /** "r, g, b" aura color; falls back to the radar accent */
  color?: string;
  /** presence id of the peer this blip represents (real peers only) */
  id?: string;
  /** distance to the peer in meters (real peers only) */
  distM?: number;
};

type RadarProps = {
  /** true = your light is on, the eye is open and scanning */
  live: boolean;
  /** other open signals to render */
  blips: Blip[];
  /** "r, g, b" — your aura color, the color of the iris + pupil */
  accent: string;
  /** tapping a blip (or empty space → null) */
  onPickBlip?: (blip: Blip | null) => void;
};

const IRIS_FRAC = 0.3;
const BLIP_FRAC = IRIS_FRAC * 0.92;

/**
 * The radar as an eye. A glowing iris scans the space around you; your light is
 * the pupil. The eye opens when your light is on and nearly closes when it's off,
 * with an occasional blink. Blips are other open lights, colored by their aura.
 */
export default function Radar({ live, blips, accent, onPickBlip }: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blipsRef = useRef<Blip[]>(blips);
  const liveRef = useRef(live);
  const accentRef = useRef(accent);

  useEffect(() => {
    blipsRef.current = blips;
    liveRef.current = live;
    accentRef.current = accent;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hasConic = typeof ctx.createConicGradient === "function";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let sweep = 0;
    let last = performance.now();
    let open = 0; // current eyelid openness 0..1
    let blinkAmt = 0;
    let blinking = false;
    let blinkElapsed = 0;
    let timeToBlink = 4;
    const glow = new Map<Blip, number>();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const isLive = liveRef.current;
      const rgb = accentRef.current;

      const size = canvas.clientWidth;
      const cx = size / 2;
      const cy = size / 2;
      const irisR = size * IRIS_FRAC;
      const blipR = size * BLIP_FRAC;
      const eyeHalfW = size * 0.47;
      const eyeMaxHalfH = size * 0.3;

      // eyelids: open when live, nearly shut when off
      const target = isLive ? 1 : 0.14;
      open += (target - open) * Math.min(1, dt * 7);

      // occasional blink while live
      if (blinking) {
        blinkElapsed += dt;
        const t = blinkElapsed / 0.16;
        blinkAmt = t < 0.5 ? t * 2 : (1 - t) * 2;
        if (t >= 1) {
          blinking = false;
          blinkAmt = 0;
        }
      } else {
        blinkAmt = 0;
        timeToBlink -= dt;
        if (isLive && !reduced && timeToBlink <= 0) {
          blinking = true;
          blinkElapsed = 0;
          timeToBlink = 5 + Math.random() * 5;
        }
      }
      const lid = Math.max(0.03, open * (1 - blinkAmt));
      const eyeHalfH = eyeMaxHalfH * lid;
      const alpha = isLive ? 1 : 0.4;

      ctx.clearRect(0, 0, size, size);

      const eyePath = () => {
        ctx.beginPath();
        ctx.moveTo(cx - eyeHalfW, cy);
        ctx.quadraticCurveTo(cx, cy - eyeHalfH, cx + eyeHalfW, cy);
        ctx.quadraticCurveTo(cx, cy + eyeHalfH, cx - eyeHalfW, cy);
        ctx.closePath();
      };

      // --- inside the eye (clipped to the almond) ---
      ctx.save();
      eyePath();
      ctx.clip();

      // iris base glow
      const base = ctx.createRadialGradient(cx, cy, irisR * 0.2, cx, cy, irisR);
      base.addColorStop(0, `rgba(${rgb}, ${0.16 * alpha})`);
      base.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);

      // iris rings
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (irisR * i) / 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb}, ${0.1 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // iris fibers
      const fibers = 56;
      for (let k = 0; k < fibers; k++) {
        const a = (k / fibers) * Math.PI * 2;
        const inner = irisR * 0.4;
        const outer = irisR * (0.82 + 0.16 * Math.sin(k * 1.7));
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.strokeStyle = `rgba(${rgb}, ${0.07 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // scanning sweep (only when live)
      if (isLive) {
        sweep -= dt * 1.1;
        if (hasConic) {
          const g = ctx.createConicGradient(sweep, cx, cy);
          g.addColorStop(0, `rgba(${rgb}, 0.5)`);
          g.addColorStop(0.09, `rgba(${rgb}, 0.1)`);
          g.addColorStop(0.25, `rgba(${rgb}, 0)`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.beginPath();
          ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweep) * irisR, cy + Math.sin(sweep) * irisR);
        ctx.strokeStyle = `rgba(${rgb}, 0.5)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // blips
      for (const b of blipsRef.current) {
        const color = b.color ?? rgb;
        if (isLive) {
          b.angle += b.drift * dt;
          const delta =
            (((sweep - b.angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          if (delta < 0.14) glow.set(b, 1);
        }
        let g = glow.get(b) ?? 0;
        g = Math.max(0, g - dt * 0.7);
        glow.set(b, g);

        const bx = cx + Math.cos(b.angle) * b.dist * blipR;
        const by = cy + Math.sin(b.angle) * b.dist * blipR;
        const a = isLive ? 0.45 + g * 0.55 : 0.15;
        const rad = 3.5 + g * 4;

        if (g > 0.01 && isLive) {
          const halo = ctx.createRadialGradient(bx, by, 0, bx, by, 16);
          halo.addColorStop(0, `rgba(${color}, ${0.5 * g})`);
          halo.addColorStop(1, `rgba(${color}, 0)`);
          ctx.beginPath();
          ctx.arc(bx, by, 16, 0, Math.PI * 2);
          ctx.fillStyle = halo;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${a})`;
        ctx.fill();
      }

      // pupil (dark core)
      const pupilR = irisR * 0.38 * lid;
      ctx.beginPath();
      ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(4, 8, 6, ${0.92 * lid})`;
      ctx.fill();

      // your light glowing at the pupil's edge + a specular glint
      const pulse = isLive ? 0.6 + 0.4 * Math.sin(now / 480) : 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${rgb}, ${pulse * lid})`;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - pupilR * 0.35, cy - pupilR * 0.4, pupilR * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * lid})`;
      ctx.fill();

      ctx.restore();

      // --- eyelid rim (drawn over everything) ---
      eyePath();
      ctx.shadowColor = `rgba(${rgb}, ${0.7 * alpha})`;
      ctx.shadowBlur = 14 * alpha;
      ctx.strokeStyle = `rgba(${rgb}, ${0.8 * alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const handlePick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onPickBlip) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const size = canvas.clientWidth;
    const cx = size / 2;
    const cy = size / 2;
    const blipR = size * BLIP_FRAC;
    let hit: Blip | null = null;
    let best = Infinity;
    for (const b of blipsRef.current) {
      if (!b.id) continue;
      const bx = cx + Math.cos(b.angle) * b.dist * blipR;
      const by = cy + Math.sin(b.angle) * b.dist * blipR;
      const d = Math.hypot(px - bx, py - by);
      if (d < 26 && d < best) {
        best = d;
        hit = b;
      }
    }
    onPickBlip(hit);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPickBlip ? handlePick : undefined}
      className="block h-full w-full"
      style={{ imageRendering: "auto", touchAction: "manipulation" }}
      aria-hidden
    />
  );
}
