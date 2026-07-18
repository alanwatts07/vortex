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
  /** "r, g, b" center color if different from the glow (the void) */
  core?: string;
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

// eye + iris geometry, relative to the canvas box (which is wider than tall).
// Blips sit on an ellipse matching the eye so none get clipped or lost.
const geo = (w: number, h: number) => {
  const irisR = Math.min(w * 0.33, h * 0.38);
  return {
    cx: w / 2,
    cy: h / 2,
    irisR,
    blipRX: w * 0.44,
    blipRY: irisR * 0.82,
    eyeHalfW: w * 0.48,
    eyeMaxHalfH: h * 0.78,
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

  // pinch-zoom / pan state
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef({
    moved: false,
    downX: 0,
    downY: 0,
    pinchDist: 0,
    midX: 0,
    midY: 0,
    lastTap: 0,
  });

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
      const { cx, cy, irisR, blipRX, blipRY, eyeHalfW, eyeMaxHalfH } = geo(w, h);

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

      // pinch-zoom / pan the eye's contents (the frame stays put)
      ctx.save();
      const zoom = zoomRef.current;
      const pan = panRef.current;
      ctx.translate(cx + pan.x, cy + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);

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

      // YOU — a compact bright light at the center, drawn UNDER the blips so
      // other people always sit on top and never get washed out
      // markers (you + blips) keep a constant screen size — divide by zoom so
      // they don't balloon when you pinch in; only their positions spread out
      const pulse = isLive ? 0.6 + 0.4 * Math.sin(now / 480) : 0.4;
      const glowR = (irisR * 0.2 * lid) / zoom;
      const yg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      yg.addColorStop(0, `rgba(${rgb}, ${0.95 * pulse * lid})`);
      yg.addColorStop(0.55, `rgba(${rgb}, ${0.3 * lid})`);
      yg.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = yg;
      ctx.fill();

      const coreR = (Math.max(2.5, irisR * 0.05) * lid) / zoom;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * lid})`;
      ctx.fill();

      // other people — bright dots on the eye's ellipse, always visible on top
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

        const bx = cx + Math.cos(b.angle) * b.dist * blipRX;
        const by = cy + Math.sin(b.angle) * b.dist * blipRY;
        const rad = (5 + g * 4) / zoom;

        const halo = ctx.createRadialGradient(bx, by, 0, bx, by, rad * 3.2);
        halo.addColorStop(
          0,
          `rgba(${color}, ${(0.34 + g * 0.4) * (isLive ? 1 : 0.4)})`,
        );
        halo.addColorStop(1, `rgba(${color}, 0)`);
        ctx.beginPath();
        ctx.arc(bx, by, rad * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${b.core ?? color}, ${isLive ? 0.7 + g * 0.3 : 0.25})`;
        ctx.fill();
      }

      ctx.restore(); // end zoom transform
      ctx.restore(); // end clip

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

  const clampView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const z = zoomRef.current;
    if (z <= 1.01) {
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      return;
    }
    const maxX = (z - 1) * canvas.clientWidth * 0.5;
    const maxY = (z - 1) * canvas.clientHeight * 0.5;
    panRef.current.x = Math.max(-maxX, Math.min(maxX, panRef.current.x));
    panRef.current.y = Math.max(-maxY, Math.min(maxY, panRef.current.y));
  };

  const pickAt = (clientX: number, clientY: number) => {
    if (!onPickBlip) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { cx, cy, blipRX, blipRY } = geo(
      canvas.clientWidth,
      canvas.clientHeight,
    );
    // invert the zoom/pan transform to reach world coordinates
    const z = zoomRef.current;
    const wx = cx + (px - cx - panRef.current.x) / z;
    const wy = cy + (py - cy - panRef.current.y) / z;
    let hit: Blip | null = null;
    let best = Infinity;
    for (const b of blipsRef.current) {
      if (!b.id) continue;
      const bx = cx + Math.cos(b.angle) * b.dist * blipRX;
      const by = cy + Math.sin(b.angle) * b.dist * blipRY;
      const d = Math.hypot(wx - bx, wy - by);
      if (d < 28 / z && d < best) {
        best = d;
        hit = b;
      }
    }
    onPickBlip(hit);
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    canvas?.setPointerCapture?.(e.pointerId);
    const pts = pointersRef.current;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    if (pts.size === 1) {
      g.moved = false;
      g.downX = e.clientX;
      g.downY = e.clientY;
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      g.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      g.midX = (a.x + b.x) / 2;
      g.midY = (a.y + b.y) / 2;
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = pointersRef.current;
    const prev = pts.get(e.pointerId);
    if (!prev) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      if (g.pinchDist > 0) {
        zoomRef.current = Math.max(
          1,
          Math.min(4.5, zoomRef.current * (dist / g.pinchDist)),
        );
      }
      panRef.current.x += midX - g.midX;
      panRef.current.y += midY - g.midY;
      g.pinchDist = dist;
      g.midX = midX;
      g.midY = midY;
      g.moved = true;
      clampView();
    } else {
      if (Math.hypot(e.clientX - g.downX, e.clientY - g.downY) > 6) g.moved = true;
      if (zoomRef.current > 1.01) {
        panRef.current.x += e.clientX - prev.x;
        panRef.current.y += e.clientY - prev.y;
        clampView();
      }
    }
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = pointersRef.current;
    const had = pts.delete(e.pointerId);
    const g = gestureRef.current;
    if (had && pts.size === 0 && !g.moved) {
      if (e.timeStamp - g.lastTap < 300) {
        zoomRef.current = 1;
        panRef.current = { x: 0, y: 0 };
        g.lastTap = 0;
      } else {
        g.lastTap = e.timeStamp;
        pickAt(g.downX, g.downY);
      }
    }
    if (pts.size < 2) g.pinchDist = 0;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="block h-full w-full"
      style={{ imageRendering: "auto", touchAction: "none" }}
      aria-hidden
    />
  );
}
