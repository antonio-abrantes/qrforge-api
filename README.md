<p align="center">
  <img src="public/assets/logo.svg" alt="QRForge" width="320" />
</p>

# QRForge

HTTP API for **customizable QR code generation** — ready to plug into apps, automations (n8n), backends, and frontends.

Instead of a plain black-and-white QR, QRForge lets you control the look (module shapes, corners, colors, center logo, framed caption) and structured payloads (Wi‑Fi, vCard, email, event, and more). Output as SVG, PNG, JPG, or ASCII — including base64 / data URL so results drop straight into JSON.

## What it’s for

- **Brands and products** that need QR codes with visual identity (colors, shapes, logo).
- **Batch jobs** (e.g. one QR per restaurant table) via async batch + ZIP/JSON.
- **Server-side integrations** (n8n, scripts, microservices) authenticated with `X-API-Key`.
- **Fast prototyping** via the built-in playground (`/playground`) and OpenAPI docs (`/docs`).

Inspired by the config model of [mini-qr](https://github.com/lyqht/mini-qr), with a custom MIT SVG renderer and `@resvg/resvg-js` for rasterization — no Chromium in the container.

## Quick start

```bash
# Redis (batch). Postgres: use a local instance or uncomment it in compose.
docker compose up -d redis

cp .env.example .env
# Set ADMIN_API_KEY (openssl rand -hex 64)
# DATABASE_URL default: postgres://postgres:123456@localhost:5432/qrapi

pnpm install
pnpm db:migrate   # creates the database if needed + applies schema
pnpm dev
```

| Resource | URL |
|---|---|
| Info / version | `GET /` |
| Health | `GET /health` |
| Docs (Swagger) | `GET /docs` |
| Playground | `GET /playground` |
| Generate QR | `POST /v1/qrcodes` + `X-API-Key` header |

Copy-paste examples: [docs/CURLS.md](docs/CURLS.md).

## Capabilities (summary)

- Styles: dots, corner squares, corner dots, background, logo, frame
- Formats: `svg` · `png` · `jpg` · `ascii` · `unicode`
- Delivery: `binary` · `base64` · `dataurl`
- Templates: text, url, email, phone, sms, wifi, vcard, location, event
- Style presets, payload detect, randomize, batch (BullMQ + Redis)
- Auth: admin key (env) + user keys (Postgres, plaintext by design for admin recovery)

## Stack

- Fastify 5 + Zod · Drizzle + PostgreSQL · BullMQ + Redis
- `qrcode-generator` · `@resvg/resvg-js` · `sharp` (JPG)

## AI agent integration guides

Two companion docs map **every current endpoint**, required/optional parameters, defaults, auth, and examples — so another AI agent (or a developer) can implement QRForge clients without reading the whole codebase.

| File | Format | When to use |
|---|---|---|
| [docs/qrforge-usage-guide/SKILL.md](docs/qrforge-usage-guide/SKILL.md) | Cursor **Agent Skill** | Environments that load skills (e.g. Cursor). Auto-discovered via description; keeps a short decision tree + StyleConfig cheat sheet in context, then points to the full guide. |
| [docs/qrforge-usage-guide/USAGE_GUIDE.md](docs/qrforge-usage-guide/USAGE_GUIDE.md) | Standalone Markdown | Any environment that **cannot** use skills (ChatGPT, Claude Projects, n8n AI nodes, custom agents, human onboarding). Self-contained Triggo-style reference — fill Base URL / API key and hand the file over. |

### Use cases

- **“Implement create QR with logo and custom colors”** — agent picks `POST /v1/qrcodes`, maps `image`, `dots`, `cornerSquares`, `cornerDots`, `background`, `format`, `response`.
- **Structured payloads** (Wi‑Fi, vCard, email, SMS, event…) — `POST /v1/qrcodes/from-template` + `templateData` tables.
- **Batch generation** (menus, seats, labels) — enqueue → poll status → download ZIP/JSON.
- **Reuse look & feel** — presets / random style, then merge into create.
- **Provision tenant keys** — admin-only `/v1/users*` flow documented end-to-end.

Prefer the **skill** when the agent runtime supports it (progressive disclosure, less token waste). Prefer the **usage guide** when you need a single pasteable document.

## Documentation

| Doc | Contents |
|---|---|
| [docs/qrforge-usage-guide/USAGE_GUIDE.md](docs/qrforge-usage-guide/USAGE_GUIDE.md) | Full API usage guide for agents & integrators |
| [docs/qrforge-usage-guide/SKILL.md](docs/qrforge-usage-guide/SKILL.md) | Cursor skill for QRForge integration |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture and pipeline |
| [docs/API.md](docs/API.md) | Endpoints and contracts |
| [docs/CURLS.md](docs/CURLS.md) | cURLs for testing |
| [docs/AUTH.md](docs/AUTH.md) | Admin key + user keys |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker / Swarm / Traefik |
| [docs/DATABASE.md](docs/DATABASE.md) | Native Postgres, compose, or VPS |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute |
| [docs/SPEC.md](docs/SPEC.md) | Product spec summary |

## License

MIT — SVG renderer reimplemented; not a GPL fork of mini-qr.

Author: **Antônio Abrantes**
