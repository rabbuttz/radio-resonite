import type { RadioBrowserStation } from "./types.js";

const CACHE_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const FETCH_BATCH_SIZE = 10000;

let cachedBaseUrl: string | null = null;
let stationCache: RadioBrowserStation[] = [];

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

async function fetchAllStations(): Promise<RadioBrowserStation[]> {
  const base = await getBaseUrl();
  const stations: RadioBrowserStation[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      has_geo_info: "true",
      hidebroken: "true",
      limit: FETCH_BATCH_SIZE.toString(),
      offset: offset.toString(),
      order: "stationuuid",
    });

    const res = await fetch(`${base}/json/stations/search?${params}`, {
      headers: { "User-Agent": "radio-resonite/1.0.0" },
    });

    if (!res.ok) {
      console.error(`radio-browser API error: ${res.status} ${res.statusText}`);
      break;
    }

    const batch: RadioBrowserStation[] = await res.json();
    stations.push(...batch);

    if (batch.length < FETCH_BATCH_SIZE) break;
    offset += batch.length;
  }

  return stations.filter((s) => s.geo_lat !== 0 || s.geo_long !== 0);
}

export async function initStationCache(): Promise<void> {
  console.log("Fetching all radio stations...");
  stationCache = await fetchAllStations();
  console.log(`Station cache loaded: ${stationCache.length} stations`);

  setInterval(async () => {
    console.log("Refreshing station cache...");
    try {
      stationCache = await fetchAllStations();
      console.log(`Station cache refreshed: ${stationCache.length} stations`);
    } catch (err) {
      console.error("Failed to refresh station cache:", err);
    }
  }, CACHE_REFRESH_INTERVAL_MS).unref();
}

export function findNearestStation(
  lat: number,
  lon: number
): RadioBrowserStation | null {
  if (stationCache.length === 0) return null;

  let nearest: RadioBrowserStation | null = null;
  let minDistance = Infinity;

  for (const station of stationCache) {
    const d = haversineDistance(lat, lon, station.geo_lat, station.geo_long);
    if (d < minDistance) {
      minDistance = d;
      nearest = station;
    }
  }

  return nearest;
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
