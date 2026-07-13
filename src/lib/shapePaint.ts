import type { DotShape } from "@/lib/chakra";

/** Draw a filled aura shape centered at (x, y) on a canvas. Ring is stroked. */
export function paintShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  shape: DotShape,
  style: string,
) {
  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) =>
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py),
    );
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  };
  const r = radius * 1.15;
  switch (shape) {
    case "ring":
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, radius * 0.55);
      ctx.strokeStyle = style;
      ctx.stroke();
      return;
    case "triangle":
      poly([
        [x, y - r],
        [x + r * 0.87, y + r * 0.5],
        [x - r * 0.87, y + r * 0.5],
      ]);
      return;
    case "diamond":
      poly([
        [x, y - r],
        [x + r, y],
        [x, y + r],
        [x - r, y],
      ]);
      return;
    case "square": {
      const s = radius * 0.92;
      ctx.fillStyle = style;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
      return;
    }
    case "star": {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
      }
      poly(pts);
      return;
    }
    default:
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = style;
      ctx.fill();
  }
}
