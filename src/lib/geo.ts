export type Coords = { lat: number; lng: number };

const R = 6371000; // earth radius, meters
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two points, in meters. */
export function distanceMeters(a: Coords, b: Coords): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a → b, in radians clockwise from north. */
export function bearingRad(a: Coords, b: Coords): number {
  const dLng = rad(b.lng - a.lng);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const y = Math.sin(dLng) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

/**
 * Convert a peer's real coordinates into a radar blip relative to `me`.
 * North points up. Returns null if the peer is beyond `rangeMeters`.
 */
export function toRadarBlip(
  me: Coords,
  peer: Coords,
  rangeMeters: number,
): { angle: number; dist: number; drift: number } | null {
  const d = distanceMeters(me, peer);
  if (d > rangeMeters) return null;
  const bearing = bearingRad(me, peer); // 0 = north, clockwise
  // radar canvas convention: x = cos(angle), y = sin(angle) with y pointing DOWN.
  // north (up) must map to -y, east (right) to +x.
  const angle = Math.atan2(-Math.cos(bearing), Math.sin(bearing));
  return { angle, dist: Math.min(1, d / rangeMeters), drift: 0 };
}
