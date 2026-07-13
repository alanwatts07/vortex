"use client";

import { useState } from "react";
import {
  CHAKRAS,
  CHAKRA_ORDER,
  SHAPES,
  type ChakraId,
  type DotShape,
} from "@/lib/chakra";
import ShapeGlyph from "@/components/ShapeGlyph";

type Props = {
  initialColor?: ChakraId;
  initialShape?: DotShape;
  onDone: (aura: { color: ChakraId; shape: DotShape }) => void;
};

/**
 * Pick your identity on the radar: a color (aura) and a shape. No questions —
 * just choose how you want to show up. Color + shape = "the purple triangle."
 */
export default function AuraPicker({
  initialColor = "heart",
  initialShape = "circle",
  onDone,
}: Props) {
  const [color, setColor] = useState<ChakraId>(initialColor);
  const [shape, setShape] = useState<DotShape>(initialShape);
  const chakra = CHAKRAS[color];
  const rgb = chakra.rgb;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#050a07]/95 px-6 py-10 backdrop-blur-sm">
      <div className="w-full max-w-sm">
        <h2 className="text-center text-xs uppercase tracking-[0.2em] text-emerald-100/40">
          This is you on the radar
        </h2>

        {/* live preview */}
        <div className="my-6 flex flex-col items-center">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${rgb},0.4), rgba(${rgb},0) 70%)`,
            }}
          >
            <ShapeGlyph shape={shape} rgb={rgb} size={56} glow />
          </div>
          <p className="mt-2 text-lg font-medium" style={{ color: `rgb(${rgb})` }}>
            {chakra.name}
          </p>
          <p className="text-xs text-emerald-100/40">feeling {chakra.mood}</p>
        </div>

        {/* color palette */}
        <p className="mb-2 text-xs text-emerald-100/40">Color</p>
        <div className="mb-6 flex flex-wrap justify-between gap-2">
          {CHAKRA_ORDER.map((id) => {
            const c = CHAKRAS[id];
            const active = id === color;
            return (
              <button
                key={id}
                type="button"
                aria-label={c.name}
                onClick={() => setColor(id)}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90"
                style={{
                  background: `rgb(${c.rgb})`,
                  boxShadow: active
                    ? `0 0 0 2px #050a07, 0 0 0 4px rgb(${c.rgb}), 0 0 18px 2px rgba(${c.rgb},0.8)`
                    : `0 0 10px -2px rgba(${c.rgb},0.6)`,
                  opacity: active ? 1 : 0.7,
                }}
              />
            );
          })}
        </div>

        {/* shape row */}
        <p className="mb-2 text-xs text-emerald-100/40">Shape</p>
        <div className="mb-8 flex justify-between gap-2">
          {SHAPES.map((s) => {
            const active = s === shape;
            return (
              <button
                key={s}
                type="button"
                aria-label={s}
                onClick={() => setShape(s)}
                className={[
                  "flex h-12 w-12 items-center justify-center rounded-xl border transition-all active:scale-90",
                  active
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-white/[0.03]",
                ].join(" ")}
              >
                <ShapeGlyph shape={s} rgb={rgb} size={26} glow={active} />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onDone({ color, shape })}
          className="w-full rounded-full px-6 py-4 text-base font-medium text-black transition-transform active:scale-[0.99]"
          style={{
            background: `rgb(${rgb})`,
            boxShadow: `0 0 40px -4px rgba(${rgb},0.8)`,
          }}
        >
          Enter the vortex
        </button>
      </div>
    </div>
  );
}
