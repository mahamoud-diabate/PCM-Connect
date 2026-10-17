export const CENTRE_SAINT_ROCH = { lat: 46.8128, lng: -71.2245 };

/** Distance en mètres entre deux points (formule de Haversine) */
export function distanceM(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Score de proximité : 1 sur place, 0 au-delà de `rayon` mètres */
export function scoreProximite(d, rayon = 1500) {
  if (d == null) return null;
  return Math.max(0, 1 - d / rayon);
}

export function formaterDistance(d) {
  if (d == null) return null;
  if (d < 30) return 'sur place';
  return d < 1000 ? `à ${Math.round(d / 10) * 10} m` : `à ${(d / 1000).toFixed(1)} km`;
}
