export type AuraId = string;

export type AuraColor = {
  id: AuraId;
  /** "r, g, b" — ready to drop into rgba() */
  rgb: string;
};

/** HSL → "r, g, b" so the whole app can keep using rgba(). */
function hslToRgb(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) => Math.round((v + m) * 255);
  return `${to(r)}, ${to(g)}, ${to(b)}`;
}

const HUE_STEP = 12; // 30 colors evenly spaced around the wheel

/**
 * The aura palette: many distinct colors spanning the full spectrum. Identity
 * is purely color now — every dot is an orb, so the hue is what you recognize.
 * Colors are unique per live person; a bigger palette means fewer clashes.
 */
export const AURA_COLORS: AuraColor[] = Array.from(
  { length: 360 / HUE_STEP },
  (_, i) => {
    const hue = i * HUE_STEP;
    return { id: `h${hue}`, rgb: hslToRgb(hue, 0.85, 0.62) };
  },
);

const BY_ID = new Map(AURA_COLORS.map((c) => [c.id, c]));

export const DEFAULT_AURA: AuraId = "h156";

export function auraRgb(id: AuraId | null | undefined): string {
  const found = id ? BY_ID.get(id) : undefined;
  return found?.rgb ?? BY_ID.get(DEFAULT_AURA)!.rgb;
}

export function isAuraId(v: unknown): v is AuraId {
  return typeof v === "string" && BY_ID.has(v);
}
