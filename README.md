# Mission Memory

**Tune in to the explorers NASA left behind.**

Mission Memory is a narrated, interactive story experience for learners aged 9–14 about the NASA hardware resting on
the Moon, on Mars and beyond. Every retired rover, lander and probe appears as a "ghost" at its real NASA
coordinates. Tune in, and it tells its own story: why it was sent, how it worked, what it discovered, its last day,
and where it rests now. Every fact is traced to NASA's NSSDCA catalog or a NASA mission page.

Built for the [2026 NASA Space Apps Challenge](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/):
*Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars*.

- **Live:** https://missionmemory.kenaff.com
- **MCP server (for AI assistants):** `https://missionmemory.kenaff.com/mcp`

## How it works

```text
https://missionmemory.kenaff.com   (one origin)
├── /                 web app (React + three.js), served by nginx
├── /embed/:id        story player without site navigation (framed by MCP hosts)
├── /data/*.json      reviewed, cited content
├── /media/*          NASA imagery and narration audio
└── /mcp              MCP server (Streamable HTTP), proxied to the private `mcp` container
```

- `web/` — Vite + React + TypeScript. Also builds `mcp-app.html`, the same player bundled as an MCP Apps view.
- `mcp/` — Node + TypeScript MCP server. Tools: `list_ghosts` and `tune_in`, which opens the story player as a
  `ui://` view inside MCP clients. It reads its content from the `web` container, so both always match.
- `scripts/` — build-time data and narration pipeline (NSSDCA ingest, Kokoro TTS).
- `brand/` — `build.py` regenerates the logo, favicons and link-preview image into `web/public`.

## Run locally

```bash
# Production layout on http://localhost:8080
PUBLIC_ORIGIN=http://localhost:8080 docker compose -f docker-compose.yml -f docker-compose.local.yml up --build

# Web development with hot reload (http://localhost:5173)
cd web && npm install && npm run dev
```

For MCP work, use the Docker layout above. The MCP server reads the built `mcp-app.html` from the `web` container.

## Deploy (Dokploy)

Create a Compose app from this repository, then attach the domain `missionmemory.kenaff.com` to service
**`web`**, port **80**, with HTTPS. Don't give the `mcp` service a domain.

## Data, credits and SI use

See [CREDITS.md](CREDITS.md) for every data source, library, font and SI tool, and how each SI tool was used.

## License

[MIT](LICENSE)
