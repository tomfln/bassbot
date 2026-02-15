# Bass Bot
Bass is a feature-rich discord music bot. \
With features like the button-controlled player message, easy interop with spotify links, \
built-in lyrics search and many more features, it offers the best listening experience.

## Quick Start (Docker)

The easiest way to run BassBot is with Docker Compose.

### 1. Create data directories

```bash
mkdir bassbot-data lavalink
```

### 2. Fetch sample configs

```bash
# Bot config
curl -o bassbot-data/config.json https://raw.githubusercontent.com/tomfln/bassbot/main/config.example.json

# Lavalink config
curl -o lavalink/application.yml https://raw.githubusercontent.com/tomfln/bassbot/main/lavalink/application.yml
```

### 3. Edit the bot config

Open `bassbot-data/config.json` and fill in your values:

```json
{
  "token": "your_bot_token_here",
  "clientId": "your_client_id_here",
  "w2gKey": "your_w2g_api_key_here",
  "nodes": [
    {
      "name": "node1",
      "url": "lavalink:2333",
      "auth": "youshallnotpass"
    }
  ]
}
```

| Key | Description |
|-----|-------------|
| `token` | Your Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications)) |
| `clientId` | Your Discord application's client ID |
| `w2gKey` | Your [Watch2Gether](https://w2g.tv/) API key |
| `apiPort` | Dashboard API port (default: `3001`) |
| `dashboardEnabled` | Enable the web dashboard (default: `true`) |
| `nodes` | Lavalink nodes — defaults work with the compose file |

### 4. (Optional) Configure Spotify

To enable Spotify link support, edit `lavalink/application.yml` and set your Spotify API credentials under `plugins.lavasrc.spotify`:

```yaml
spotify:
  clientId: "your_spotify_client_id"
  clientSecret: "your_spotify_client_secret"
```

You can create these at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

### 5. Start

```bash
docker compose up -d
```

The bot will start, connect to Lavalink, and be ready to use. Invite it to your server, join a voice channel, and run `/play`.

> **Tip:** All config values can also be overridden via environment variables in the compose file (e.g., `TOKEN`, `CLIENT_ID`). Env vars take priority over `config.json`.

---

## YouTube OAuth Setup

YouTube requires OAuth authentication for reliable playback. Without it, you may encounter errors or age-restricted content blocks.

> **Warning:** Use a **burner Google account**, not your main one. OAuth tokens give access to the account's YouTube data.

### First-time setup (getting a refresh token)

1. In `lavalink/application.yml`, make sure OAuth is enabled **without** a refresh token:

   ```yaml
   plugins:
     youtube:
       oauth:
         enabled: true
   ```

2. Start the stack:
   ```bash
   docker compose up -d
   ```

3. Watch the Lavalink logs:
   ```bash
   docker logs -f lavalink
   ```

4. Lavalink will print a message like:
   ```
   To give youtube-source access to your account, go to https://www.google.com/device and enter code XXXX-XXXX
   ```

5. Open the URL in your browser, sign in with a **burner Google account**, and enter the code.

6. Once authorized, Lavalink logs will show:
   ```
   Token retrieved successfully. Store your refresh token as this can be reused. (1//0xxxx...)
   ```

7. Copy the refresh token and add it to `lavalink/application.yml`:

   ```yaml
   plugins:
     youtube:
       oauth:
         enabled: true
         refreshToken: "1//0xxxx..."
         skipInitialization: true
   ```

8. Restart Lavalink to apply:
   ```bash
   docker compose restart lavalink
   ```

From now on, Lavalink will use the refresh token automatically — no manual login needed.

---

## Local Development

1. Clone the repository
2. Run `bun install`
3. Create a `data/` directory with a `config.json` (see `config.example.json`)
4. Run `bun register` to register slash commands
5. Run `bun dev` to start the bot + dashboard in dev mode

## Technologies

- **TypeScript** — Fully typed codebase with custom type-safe command framework
- **Bun** — Fast JS runtime, no build step needed
- **Lavalink + Shoukaku** — Reliable audio playback with Spotify/SoundCloud support
- **Discord.js** — Discord API interaction
- **Drizzle ORM + SQLite** — Lightweight embedded database for persistence
- **React + Vite** — Dashboard for monitoring the bot

## License
This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more information.

## Contributing
Contributions are welcome! Please open an issue or a pull request.
