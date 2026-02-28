import { WebSocketServer, WebSocket } from "ws";
import { findNearestStation, initStationCache } from "./radio-api.js";
import type { ClientMessage, ServerMessage } from "./types.js";

const PORT = Number(process.env.PORT) || 3210;
const DEBOUNCE_MS = 200;

interface ClientState {
  lastStationUuid: string | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

const clients = new Map<WebSocket, ClientState>();

await initStationCache();

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.set(ws, { lastStationUuid: null, debounceTimer: null });

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      console.error("Invalid JSON received");
      return;
    }

    if (msg.type !== "update_position" || typeof msg.lat !== "number" || typeof msg.lon !== "number") {
      console.error("Invalid message format");
      return;
    }

    const state = clients.get(ws)!;

    if (state.debounceTimer) clearTimeout(state.debounceTimer);

    state.debounceTimer = setTimeout(() => {
      try {
        const station = findNearestStation(msg.lat, msg.lon);
        if (!station) {
          console.error("No station found");
          return;
        }

        state.lastStationUuid = station.stationuuid;

        const response: ServerMessage = {
          type: "station",
          station: {
            name: station.name,
            url: station.url_resolved,
            codec: station.codec,
            bitrate: station.bitrate,
            country: station.country,
            lat: Number(station.geo_lat.toFixed(5)),
            lon: Number(station.geo_long.toFixed(5)),
          },
        };
        ws.send(JSON.stringify(response));
        console.log(`Station changed: ${station.name}`);
      } catch (err) {
        console.error("Error finding station:", err);
      }
    }, DEBOUNCE_MS);
  });

  ws.on("close", () => {
    const state = clients.get(ws);
    if (state?.debounceTimer) clearTimeout(state.debounceTimer);
    clients.delete(ws);
    console.log("Client disconnected");
  });
});

console.log(`WebSocket server listening on ws://localhost:${PORT}`);
