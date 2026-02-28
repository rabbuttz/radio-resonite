import { WebSocketServer, WebSocket } from "ws";
import { findNearestStation, initStationCache } from "./radio-api.js";
import type { ClientMessage, ServerMessage } from "./types.js";

const PORT = Number(process.env.PORT) || 3210;

await initStationCache();

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Client connected");

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

    try {
      const station = findNearestStation(msg.lat, msg.lon);
      if (!station) {
        console.error("No station found");
        return;
      }

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
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log(`WebSocket server listening on ws://localhost:${PORT}`);
