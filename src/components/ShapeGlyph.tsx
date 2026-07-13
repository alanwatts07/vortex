import type { DotShape } from "@/lib/chakra";

type Props = {
  shape: DotShape;
  /** "r, g, b" */
  rgb: string;
  size?: number;
  glow?: boolean;
};

/** Renders a dot shape as an SVG, matching how the radar draws blips. */
export default function ShapeGlyph({ shape, rgb, size = 24, glow }: Props) {
  const fill = `rgb(${rgb})`;
  const filter = glow
    ? `drop-shadow(0 0 ${size * 0.25}px rgba(${rgb},0.9))`
    : undefined;

  const common = { fill } as const;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ filter }}
      aria-hidden
    >
      {shape === "circle" && <circle cx="12" cy="12" r="8" {...common} />}
      {shape === "ring" && (
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="none"
          stroke={fill}
          strokeWidth="3.4"
        />
      )}
      {shape === "triangle" && (
        <polygon points="12,3.5 20.5,19 3.5,19" {...common} />
      )}
      {shape === "diamond" && (
        <polygon points="12,2.5 21.5,12 12,21.5 2.5,12" {...common} />
      )}
      {shape === "square" && (
        <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" {...common} />
      )}
      {shape === "star" && (
        <polygon
          points="12,2.5 14.6,9.3 21.8,9.5 16.1,13.9 18.1,20.8 12,16.6 5.9,20.8 7.9,13.9 2.2,9.5 9.4,9.3"
          {...common}
        />
      )}
    </svg>
  );
}
