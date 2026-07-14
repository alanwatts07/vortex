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
};

type RadarProps = {
  /** true = your light is on, radar is live */
  live: boolean;
  /** other open signals to render */
  blips: Blip[];
  /** "r, g, b" — your aura color, tints the chrome + your center dot */
  accent: string;
};

/**
 * A self-contained animated radar. Draws range rings, a rotating sweep beam,
 * crosshairs, and blips that flare in their own aura color as the beam passes
 * over them. When `live` is false the whole thing dims to a dormant standby.
 */
export default function Radar({ live, blips, accent }: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blipsRef = useRef<Blip[]>(blips);
  const liveRef = useRef(live);
  const accentRef = useRef(accent);

  // keep latest props available to the animation loop without restarting it
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

    // old iOS Safari (< 15) lacks conic gradients — fall back to a wedge sweep
    const hasConic = typeof ctx.createConicGradient === "function";

    let raf = 0;
    let sweep = 0; // current beam angle
    let last = performance.now();
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
      const accentRgb = accentRef.current;

      const size = canvas.clientWidth;
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 2;

      ctx.clearRect(0, 0, size, size);

      const baseAlpha = isLive ? 1 : 0.28;

      // range rings
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${accentRgb}, ${0.12 * baseAlpha})`;
        ctx.stroke();
      }

      // crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.strokeStyle = `rgba(${accentRgb}, ${0.08 * baseAlpha})`;
      ctx.stroke();

      // advance + draw the sweep beam only when live
      if (isLive) {
        sweep -= dt * 1.15; // radians/sec, clockwise
        if (hasConic) {
          const grad = ctx.createConicGradient(sweep, cx, cy);
          grad.addColorStop(0, `rgba(${accentRgb}, 0.55)`);
          grad.addColorStop(0.08, `rgba(${accentRgb}, 0.12)`);
          grad.addColorStop(0.25, `rgba(${accentRgb}, 0)`);
          grad.addColorStop(1, `rgba(${accentRgb}, 0)`);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          // fallback: a soft trailing wedge behind the leading edge
          const wedge = 0.6;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, sweep, sweep + wedge);
          ctx.closePath();
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(${accentRgb}, 0.3)`);
          g.addColorStop(1, `rgba(${accentRgb}, 0)`);
          ctx.fillStyle = g;
          ctx.fill();
        }

        // leading edge line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweep) * r, cy + Math.sin(sweep) * r);
        ctx.strokeStyle = `rgba(${accentRgb}, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // blips
      const current = blipsRef.current;
      for (const b of current) {
        const color = b.color ?? accentRgb;
        if (isLive) {
          b.angle += b.drift * dt;
          const delta = ((sweep - b.angle) % (Math.PI * 2) + Math.PI * 2) %
            (Math.PI * 2);
          if (delta < 0.14) {
            glow.set(b, 1);
          }
        }
        let g = glow.get(b) ?? 0;
        g = Math.max(0, g - dt * 0.7); // fade
        glow.set(b, g);

        const bx = cx + Math.cos(b.angle) * b.dist * r;
        const by = cy + Math.sin(b.angle) * b.dist * r;

        const a = isLive ? 0.4 + g * 0.6 : 0.12;
        const rad = 3.5 + g * 4;

        // halo
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

      // you, at the center
      const pulse = isLive ? 0.5 + 0.5 * Math.sin(now / 500) : 0;
      if (isLive) {
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22 + pulse * 8);
        halo.addColorStop(0, `rgba(${accentRgb}, 0.6)`);
        halo.addColorStop(1, `rgba(${accentRgb}, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, 22 + pulse * 8, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = isLive
        ? `rgba(${accentRgb}, 1)`
        : `rgba(${accentRgb}, 0.35)`;
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full"
      style={{ imageRendering: "auto" }}
      aria-hidden
    />
  );
}
