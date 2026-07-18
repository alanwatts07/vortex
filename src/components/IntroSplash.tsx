"use client";

type Props = {
  onDone: () => void;
};

/**
 * First-run splash: an invitation, not instructions. The manifesto voice —
 * turn your light on, look up, and hold a stranger's gaze to know you've found
 * each other.
 */
export default function IntroSplash({ onDone }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#050a07]/95 px-6 py-12 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_3px_rgba(52,211,153,0.9)]" />
          <h1 className="text-2xl font-semibold tracking-tight">Finding Us</h1>
        </div>

        <p className="text-lg leading-relaxed text-emerald-50/90">
          Human beings were never meant to walk past one another.
        </p>

        <div className="flex flex-col gap-2 text-xl font-medium text-emerald-100/90">
          <span>Turn your light on.</span>
          <span>Look up.</span>
          <span>Lock eyes — and hold.</span>
        </div>

        <div className="w-full">
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-full bg-emerald-400 px-6 py-4 text-base font-medium text-emerald-950 shadow-[0_0_40px_-4px_rgba(52,211,153,0.8)] transition-transform active:scale-[0.99]"
          >
            Choose your color →
          </button>
          <p className="mt-4 text-xs text-emerald-100/30">
            Your location is only ever shared while your light is on.
          </p>
        </div>
      </div>
    </div>
  );
}
