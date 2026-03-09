# Twitch Adblock

A browser extension + local server that removes ads from Twitch streams by intercepting and serving clean video playlists. Works on Chrome and Firefox.

## How It Works

1. The **local server** (Java) fetches the raw HLS playlist for a Twitch stream
2. It strips ad segments and serves a clean playlist on `localhost:7777`
3. The **browser extension** detects when you're watching a stream and replaces Twitch's ad-infested player with one pointing at the clean local playlist
4. You get the same stream, same quality — no ads

## Setup

### Windows

1. Go to [Releases](https://github.com/hawolt/twitch-adblock/releases)
2. Download `local-server.exe` and `twitch-adblock-chrome.zip` (or `twitch-adblock-firefox.zip`)
3. Open your browser's extensions page and enable **Developer Mode**
4. Drag and drop the extension zip to install it
5. Run `local-server.exe` — keep it running while you watch Twitch

### macOS / Linux

1. Install [Java 17+](https://www.oracle.com/java/technologies/downloads/)
2. Go to [Releases](https://github.com/hawolt/twitch-adblock/releases)
3. Download `local-server.jar` and `twitch-adblock-chrome.zip` (or `twitch-adblock-firefox.zip`)
4. Open your browser's extensions page and enable **Developer Mode**
5. Drag and drop the extension zip to install it
6. Run `java -jar local-server.jar` — keep it running while you watch Twitch

## Features

### Core
- Ad-free Twitch streams via local HLS playlist proxying
- Chrome and Firefox support (Manifest V3 via WXT)
- System tray icon for the local server

### Player Controls
Custom overlay on the replacement player with full playback controls:
- Play/pause, volume slider with mute toggle
- Live indicator with pulsing badge
- Theater mode and fullscreen toggles
- Auto-hide after 3 seconds of inactivity
- Styled to match Twitch's dark theme

### Health Monitoring
- `GET /health` and `GET /status` endpoints on the local server
- Extension badge turns green when connected, red when the server is down
- Popup shows server status, active stream count, and connection info
- Background health checks every 60 seconds with 30-second result caching

### Security
- CORS restricted to `twitch.tv` and browser extension origins only (no wildcard)
- Server binds to `127.0.0.1` — not exposed to the local network
- Content Security Policy in the extension manifest prevents XSS

### Error Handling
- Retry with exponential backoff (3 attempts, 1s → 2s → 4s)
- Request timeouts (10s default, 5s for health checks)
- Graceful degradation — if the server is unreachable, Twitch's native player stays active
- Toast notifications for connection state changes

### Logging
- Configurable log levels: DEBUG, INFO, WARN, ERROR
- Timestamped entries with category prefixes
- Log level persisted in extension storage

## Project Structure

```
├── extension/               # Browser extension (WXT + Bun)
│   ├── entrypoints/         # Content script, background worker, popup
│   ├── utils/               # API client, storage, logger, player controls
│   └── styles/              # Control bar CSS
├── local-server/            # Java server (Javalin + Maven)
│   ├── src/main/java/       # Server, stream management, tray icon
│   └── src/test/java/       # JUnit 5 test suite
├── rust-wrapper/            # Creates native executable for the server
└── .github/workflows/       # CI/CD pipeline
```

## Building from Source

### Extension
```bash
cd extension
bun install
bun run build        # Production build
bun run dev          # Dev mode with hot reload
```

### Local Server
```bash
cd local-server
mvn clean package    # Build JAR
mvn test             # Run test suite
```

## Contributing

Create a branch with the `dev-` prefix (e.g. `dev-tray-icon`). Do not PR directly to main.

## Troubleshooting

**Server won't start:** Make sure port 7777 is free and Java 17+ is installed.

**Extension not working:** Check that the server is running (visit `http://localhost:7777/health` in your browser). The extension popup also shows connection status.

**Stream not loading:** Open the browser console and check for errors. Set the log level to DEBUG in the extension popup for detailed output.

For questions or support, join the [Discord](https://discord.gg/VFSBjVn3c4).
