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
  /** "r, g, b" — your aura color, the color of the iris + your light */
  accent: string;
  /** tapping a blip (or empty space → null) */
  onPickBlip?: (blip: Blip | null) => void;
};

// eye + iris geometry, relative to the canvas box (which is wider than tall)
const geo = (w: number, h: number) => {
  const irisR = Math.min(w * 0.34, h * 0.46);
  return {
    cx: w / 2,
    cy: h / 2,
    irisR,
    blipR: irisR * 0.94,
    eyeHalfW: w * 0.48,
    eyeMaxHalfH: h * 0.47,
  };
};

/**
 * The radar as an eye. A glowing iris scans the space around you; your light is
 * a bright dot at the center (the pupil). The eye opens when your light is on
 * and nearly closes when it's off, with an occasional blink.
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
    let open = 0;
    let blinkAmt = 0;
    let blinking = false;
    let blinkElapsed = 0;
    let timeToBlink = 4;
    const glow = new Map<Blip, number>();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
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

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const { cx, cy, irisR, blipR, eyeHalfW, eyeMaxHalfH } = geo(w, h);

      const target = isLive ? 1 : 0.16;
      open += (target - open) * Math.min(1, dt * 7);

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
      const alpha = isLive ? 1 : 0.45;

      ctx.clearRect(0, 0, w, h);

      const eyePath = () => {
        ctx.beginPath();
        ctx.moveTo(cx - eyeHalfW, cy);
        ctx.quadraticCurveTo(cx, cy - eyeHalfH, cx + eyeHalfW, cy);
        ctx.quadraticCurveTo(cx, cy + eyeHalfH, cx - eyeHalfW, cy);
        ctx.closePath();
      };

      // --- inside the eye ---
      ctx.save();
      eyePath();
      ctx.clip();

      const base = ctx.createRadialGradient(cx, cy, irisR * 0.2, cx, cy, irisR);
      base.addColorStop(0, `rgba(${rgb}, ${0.16 * alpha})`);
      base.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (irisR * i) / 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb}, ${0.1 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const fibers = 60;
      for (let k = 0; k < fibers; k++) {
        const a = (k / fibers) * Math.PI * 2;
        const inner = irisR * 0.32;
        const outer = irisR * (0.84 + 0.14 * Math.sin(k * 1.7));
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.strokeStyle = `rgba(${rgb}, ${0.07 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (isLive) {
        sweep -= dt * 1.1;
        if (hasConic) {
          const g = ctx.createConicGradient(sweep, cx, cy);
          g.addColorStop(0, `rgba(${rgb}, 0.45)`);
          g.addColorStop(0.09, `rgba(${rgb}, 0.09)`);
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
        ctx.strokeStyle = `rgba(${rgb}, 0.45)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // other people
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
        const a = isLive ? 0.5 + g * 0.5 : 0.15;
        const rad = 4 + g * 4;

        if (g > 0.01 && isLive) {
          const halo = ctx.createRadialGradient(bx, by, 0, bx, by, 18);
          halo.addColorStop(0, `rgba(${color}, ${0.5 * g})`);
          halo.addColorStop(1, `rgba(${color}, 0)`);
          ctx.beginPath();
          ctx.arc(bx, by, 18, 0, Math.PI * 2);
          ctx.fillStyle = halo;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${a})`;
        ctx.fill();
      }

      // faint dark pupil well, so the eye still reads
      ctx.beginPath();
      ctx.arc(cx, cy, irisR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(4, 8, 6, ${0.45 * lid})`;
      ctx.fill();

      // YOU — a bright light at the center
      const pulse = isLive ? 0.6 + 0.4 * Math.sin(now / 480) : 0.4;
      const glowR = irisR * 0.5 * lid;
      const yg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      yg.addColorStop(0, `rgba(${rgb}, ${0.95 * pulse * lid})`);
      yg.addColorStop(0.5, `rgba(${rgb}, ${0.35 * lid})`);
      yg.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = yg;
      ctx.fill();

      const coreR = Math.max(4, irisR * 0.11) * lid;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR + 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb}, ${lid})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * lid})`;
      ctx.fill();

      ctx.restore();

      // --- eyelid rim ---
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
    const { cx, cy, blipR } = geo(canvas.clientWidth, canvas.clientHeight);
    let hit: Blip | null = null;
    let best = Infinity;
    for (const b of blipsRef.current) {
      if (!b.id) continue;
      const bx = cx + Math.cos(b.angle) * b.dist * blipR;
      const by = cy + Math.sin(b.angle) * b.dist * blipR;
      const d = Math.hypot(px - bx, py - by);
      if (d < 28 && d < best) {
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
