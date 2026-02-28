# Radio Resonite

Resoniteからプレイヤーの緯度経度座標をWebSocketで受信し、[radio-browser.info](https://www.radio-browser.info/) APIで最寄りのラジオ局を検索してストリームURLを返すサーバー。

## セットアップ

```bash
npm install
```

## 起動

```bash
npm start
```

デフォルトポートは `3210`。変更する場合:

```bash
PORT=8080 npm start
```

## WebSocketプロトコル

### Resonite → Server

座標を送信:

```json
{ "type": "update_position", "lat": 35.6762, "lon": 139.6503 }
```

### Server → Resonite

最寄り局が切り替わった場合:

```json
{
  "type": "station_changed",
  "station": {
    "name": "Station Name",
    "url": "http://stream.example.com/radio",
    "codec": "MP3",
    "bitrate": 128,
    "country": "Japan",
    "distance_km": 12.5
  }
}
```

前回と同じ局の場合:

```json
{ "type": "station_unchanged" }
```

## 仕組み

1. WebSocket接続を受け付ける
2. 座標データ受信時、radio-browser APIで最寄り局を検索
3. 前回と同じ局なら `station_unchanged`、異なる局なら `station_changed` を返す
4. 同一クライアントからの高頻度リクエストは200msデバウンスされる
