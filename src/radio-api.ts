import type { RadioBrowserStation } from "./types.js";

let cachedBaseUrl: string | null = null;

async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;

  const res = await fetch(
    "https://de1.api.radio-browser.info/json/servers"
  );
  const servers: { name: string }[] = await res.json();
  if (servers.length === 0) {
    cachedBaseUrl = "https://de1.api.radio-browser.info";
  } else {
    const pick = servers[Math.floor(Math.random() * servers.length)];
    cachedBaseUrl = `https://${pick.name}`;
  }
  console.log(`Using radio-browser server: ${cachedBaseUrl}`);
  return cachedBaseUrl;
}

export async function findNearestStation(
  lat: number,
  lon: number
): Promise<RadioBrowserStation | null> {
  const base = await getBaseUrl();
  // Fetch a larger batch because the API's geo_distance sort is unreliable
  const params = new URLSearchParams({
    geo_lat: lat.toString(),
    geo_long: lon.toString(),
    order: "geo_distance",
    limit: "200",
    has_geo_info: "true",
    hidebroken: "true",
  });

  const res = await fetch(`${base}/json/stations/search?${params}`, {
    headers: { "User-Agent": "radio-resonite/1.0.0" },
  });

  if (!res.ok) {
    console.error(`radio-browser API error: ${res.status} ${res.statusText}`);
    return null;
  }

  const stations: RadioBrowserStation[] = await res.json();

  // Filter out stations without valid coordinates, then sort by actual distance
  const withDistance = stations
    .filter((s) => s.geo_lat !== 0 || s.geo_long !== 0)
    .map((s) => ({
      station: s,
      distance: haversineDistance(lat, lon, s.geo_lat, s.geo_long),
    }))
    .sort((a, b) => a.distance - b.distance);

  return withDistance[0]?.station ?? null;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
