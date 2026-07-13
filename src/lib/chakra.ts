export type ChakraId =
  | "root"
  | "sacral"
  | "solar"
  | "heart"
  | "throat"
  | "thirdEye"
  | "crown";

export type Chakra = {
  id: ChakraId;
  name: string;
  sanskrit: string;
  /** "r, g, b" — ready to drop into rgba() */
  rgb: string;
  /** one-word flavor for this color */
  mood: string;
};

/** Root → Crown, the canonical order (used for palettes and legends). */
export const CHAKRA_ORDER: ChakraId[] = [
  "root",
  "sacral",
  "solar",
  "heart",
  "throat",
  "thirdEye",
  "crown",
];

export const CHAKRAS: Record<ChakraId, Chakra> = {
  root: { id: "root", name: "Root", sanskrit: "Muladhara", rgb: "244, 63, 94", mood: "grounded" },
  sacral: { id: "sacral", name: "Sacral", sanskrit: "Svadhisthana", rgb: "251, 146, 60", mood: "playful" },
  solar: { id: "solar", name: "Solar", sanskrit: "Manipura", rgb: "250, 204, 21", mood: "driven" },
  heart: { id: "heart", name: "Heart", sanskrit: "Anahata", rgb: "52, 211, 153", mood: "open" },
  throat: { id: "throat", name: "Throat", sanskrit: "Vishuddha", rgb: "56, 189, 248", mood: "expressive" },
  thirdEye: { id: "thirdEye", name: "Third Eye", sanskrit: "Ajna", rgb: "129, 140, 248", mood: "intuitive" },
  crown: { id: "crown", name: "Crown", sanskrit: "Sahasrara", rgb: "192, 132, 252", mood: "transcendent" },
};

export const DEFAULT_CHAKRA: ChakraId = "heart";

export function chakraRgb(id: ChakraId | null | undefined): string {
  return CHAKRAS[id ?? DEFAULT_CHAKRA].rgb;
}

// ---- dot shapes -----------------------------------------------------------

export type DotShape =
  | "circle"
  | "ring"
  | "triangle"
  | "diamond"
  | "square"
  | "star";

export const SHAPES: DotShape[] = [
  "circle",
  "ring",
  "triangle",
  "diamond",
  "square",
  "star",
];

export const DEFAULT_SHAPE: DotShape = "circle";

export function isShape(v: unknown): v is DotShape {
  return typeof v === "string" && (SHAPES as string[]).includes(v);
}
