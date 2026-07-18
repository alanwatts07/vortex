"use client";

type Props = {
  on: boolean;
  onChange: (next: boolean) => void;
  /** "r, g, b" aura color used for the glow when on */
  color: string;
};

/** The one control that matters: flip your light on or off. */
export default function LightSwitch({ on, onChange, color }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Toggle your light"
      onClick={() => onChange(!on)}
      className={[
        "group relative flex h-16 w-32 items-center rounded-full border px-1.5 transition-all duration-300",
        on ? "border-white/20" : "border-white/10 bg-white/5",
      ].join(" ")}
      style={
        on
          ? {
              background: `rgba(${color}, 0.2)`,
              boxShadow: `0 0 40px -4px rgba(${color}, 0.7)`,
            }
          : undefined
      }
    >
      <span
        className={[
          "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
          on ? "translate-x-16" : "translate-x-0 bg-white/30",
        ].join(" ")}
        style={
          on
            ? {
                background: `rgb(${color})`,
                boxShadow: `0 0 20px 2px rgba(${color}, 0.9)`,
              }
            : undefined
        }
      >
        <span
          className={[
            "h-2.5 w-2.5 rounded-full transition-all duration-300",
            on ? "bg-black/60" : "bg-white/50",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
