export type Location = { address: string | null; latitude: number | null; longitude: number | null };

/**
 * "35.0394, 135.7292" (as Google Maps copies it) into coordinates. Empty text
 * is null; anything else that is not a valid pair is undefined.
 */
export function parseCoordinates(text: string): { latitude: number; longitude: number } | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = /^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/.exec(trimmed);
  if (!match) return undefined;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  return { latitude, longitude };
}

export function formatCoordinates(location: Location) {
  return location.latitude === null || location.longitude === null ? "" : `${location.latitude}, ${location.longitude}`;
}

/** A Google Maps link (opens the app on phones): the coordinates, else the address, else null. */
export function mapUrl(location: Location, name?: string) {
  if (location.latitude !== null && location.longitude !== null) return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  const address = location.address?.trim();
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name ? `${name}, ${address}` : address)}`;
  return null;
}
