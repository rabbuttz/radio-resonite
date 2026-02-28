export interface UpdatePositionMessage {
  type: "update_position";
  lat: number;
  lon: number;
}

export interface StationMessage {
  type: "station";
  station: {
    name: string;
    url: string;
    codec: string;
    bitrate: number;
    country: string;
    lat: number;
    lon: number;
  };
}

export type ClientMessage = UpdatePositionMessage;
export type ServerMessage = StationMessage;

export interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  codec: string;
  bitrate: number;
  country: string;
  geo_lat: number;
  geo_long: number;
}
