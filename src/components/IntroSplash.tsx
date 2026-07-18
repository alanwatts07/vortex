"use client";

type Props = {
  onDone: () => void;
};

const POINTS: { color: string; title: string; body: string }[] = [
  {
    color: "52, 211, 153",
    title: "Turn your light on",
    body: "When you're open to meeting someone, turn on. You become a light nearby. Off, and you fade — no trace.",
  },
  {
    color: "56, 189, 248",
    title: "Look up",
    body: "See who else is here and open right now — each a different color.",
  },
  {
    color: "192, 132, 252",
    title: "Meet in person",
    body: "Spot each other by color, put your phones down, and talk. The app ends where connection begins.",
  },
];

/**
 * First-run splash: what Finding Us is, why it exists, and how people find each
 * other. Deliberately short — it's a doorway, not a manual.
 */
export default function IntroSplash({ onDone }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#050a07]/95 px-6 py-10 backdrop-blur-sm">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_3px_rgba(52,211,153,0.9)]" />
            <h1 className="text-2xl font-semibold tracking-tight">Finding Us</h1>
          </div>
          <p className="text-sm text-emerald-100/55">
            Human beings were never meant to walk past one another.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {POINTS.map((p, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4"
            >
              <span
                className="mt-1 h-4 w-4 shrink-0 rounded-full"
                style={{
                  background: `rgb(${p.color})`,
                  boxShadow: `0 0 16px 2px rgba(${p.color},0.7)`,
                }}
              />
              <div>
                <h3 className="text-base font-medium">{p.title}</h3>
                <p className="mt-0.5 text-sm text-emerald-100/50">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onDone}
          className="mt-8 w-full rounded-full bg-emerald-400 px-6 py-4 text-base font-medium text-emerald-950 shadow-[0_0_40px_-4px_rgba(52,211,153,0.8)] transition-transform active:scale-[0.99]"
        >
          Choose your color →
        </button>
        <p className="mt-4 text-center text-xs text-emerald-100/30">
          Your location is only ever shared while your light is on.
        </p>
      </div>
    </div>
  );
}
