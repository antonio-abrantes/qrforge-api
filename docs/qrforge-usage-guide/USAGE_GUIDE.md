# QRForge API — Usage Guide

> Standalone technical reference for integrating with **QRForge** (qr-api).
> Fill in the configuration table, then give this file to any AI agent, service,
> or developer that needs to call the API. No skill runtime required.

## Configuration (fill in before use)

| Field | Value |
|---|---|
| **Base URL** | `[YOUR_QRFORGE_BASE_URL]` (e.g. `https://qr.example.com` or `http://localhost:3000`) |
| **API Version** | 1.0.0 (OpenAPI 3.1) |
| **Product prefix** | `/v1` |
| **Swagger UI** | `[YOUR_QRFORGE_BASE_URL]/docs` |
| **Spec JSON** | `[YOUR_QRFORGE_BASE_URL]/docs/json` |
| **Playground** | `[YOUR_QRFORGE_BASE_URL]/playground` |
| **API Key** | `[YOUR_API_KEY]` (admin or user key) |
| **Admin API Key** | `[YOUR_ADMIN_API_KEY]` (required for `/v1/users*`) |

### Path convention

- **Real HTTP paths** include `/v1` for product routes: `POST /v1/qrcodes`
- **OpenAPI / Swagger** lists paths relative to server `/v1`: `POST /qrcodes`
- `/health`, `/`, `/docs`, `/playground` live at the **host root** (no `/v1`)

---

## Authentication

All `/v1/*` routes require:

```
X-API-Key: [YOUR_API_KEY]
```

| Key type | Source | Can call |
|---|---|---|
| **Admin** | Env `ADMIN_API_KEY` (≥32 chars) | Everything under `/v1` |
| **User** | Created via `POST /v1/users` | QR generation, detect, random, batch, presets |
| — | — | Public routes need **no** key |

Public (no key): `GET /`, `GET /health`, `/docs*`, `/playground*`, `/assets*`.

### Auth errors

| Code | Body `error` | When |
|---|---|---|
| `401` | `missing_api_key` | Header absent |
| `401` | `invalid_api_key` | Unknown or inactive user key |
| `403` | `forbidden` | User key used on admin-only `/v1/users*` |

---

## Quick endpoint map

| Method | Path | Auth | Summary |
|---|---|---|---|
| `GET` | `/` | public | Service info + links |
| `GET` | `/health` | public | Liveness probe |
| `POST` | `/v1/qrcodes` | key | Generate QR from raw `data` + style |
| `POST` | `/v1/qrcodes/from-template` | key | Structured payload templates → QR |
| `POST` | `/v1/qrcodes/detect` | key | Detect type of a payload string |
| `POST` | `/v1/qrcodes/random` | key | Random style config (no image) |
| `POST` | `/v1/qrcodes/batch` | key | Enqueue async multi-QR job |
| `GET` | `/v1/qrcodes/batch/:jobId/status` | key | Poll batch status |
| `GET` | `/v1/qrcodes/batch/:jobId/download` | key | Download ZIP or JSON result |
| `GET` | `/v1/presets` | key | List style presets |
| `GET` | `/v1/presets/:id` | key | Get one preset |
| `POST` | `/v1/users` | admin | Create user + plaintext API key |
| `GET` | `/v1/users` | admin | List users |
| `GET` | `/v1/users/:id` | admin | Get user |
| `GET` | `/v1/users/:id/reveal-key` | admin | Reveal stored key |
| `POST` | `/v1/users/:id/rotate-key` | admin | Rotate key |
| `PATCH` | `/v1/users/:id` | admin | Update name/email/active |
| `DELETE` | `/v1/users/:id` | admin | Hard-delete user |

---

## Data models

### StyleConfig

Shared style object. On `POST /qrcodes` these fields sit **flat on the body**.
On `from-template` and `batch` they nest under `style`.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `size` | `integer` (64–4096) | no | `200` | Output size in pixels |
| `margin` | `integer` (0–100) | no | `0` | Quiet-zone margin |
| `errorCorrectionLevel` | enum | no | `Q` | `L` \| `M` \| `Q` \| `H` — use `H` when embedding a logo |
| `dots` | object | no | see defaults | Module (dot) style |
| `dots.shape` | enum | no | `square` | `square` \| `rounded` \| `extra-rounded` \| `classy` \| `classy-rounded` \| `dots` |
| `dots.color` | color | no | `#000000` | Hex `#RGB` / `#RRGGBB` or `transparent` |
| `cornerSquares` | object | no | — | Outer finder pattern style |
| `cornerSquares.shape` | enum | no | `square` | `square` \| `rounded` \| `extra-rounded` \| `dot` |
| `cornerSquares.color` | color | no | `#000000` | |
| `cornerDots` | object | no | — | Inner finder pattern style |
| `cornerDots.shape` | enum | no | `square` | `square` \| `rounded` \| `dot` |
| `cornerDots.color` | color | no | `#000000` | |
| `background` | object | no | — | Canvas background |
| `background.color` | color | no | `#ffffff` | |
| `image` | Image | no | — | Center logo |
| `frame` | Frame | no | — | Caption / border frame around the QR |

### Image

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `href` | `string` | **yes** | — | Public URL or `data:` URI (PNG/JPG/SVG/WebP). Server fetches and inlines it. |
| `sizeRatio` | `number` (0.05–0.5) | no | library default | Logo size relative to QR |
| `margin` | `number` (≥0) | no | — | Clearance around logo |
| `hideBackgroundDots` | `boolean` | no | — | Hide modules under the logo |
| `crossOrigin` | enum | no | — | `anonymous` \| `use-credentials` |

> Max fetch size / timeout are server env (`IMAGE_FETCH_MAX_BYTES` default 2 MiB, `IMAGE_FETCH_TIMEOUT_MS` default 5000).

### Frame

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | `string` (min 1) | **yes** | Caption text |
| `textPosition` | enum | **yes** | `top` \| `bottom` \| `left` \| `right` |
| `textColor` | color | no | Caption color |
| `backgroundColor` | color | no | Frame fill |
| `borderColor` | color | no | Border color |
| `borderWidth` | `number` (≥0) | no | Border thickness |
| `borderRadius` | `number` (≥0) | no | Corner radius |
| `padding` | `number` (≥0) | no | Inner padding |
| `fontFamily` | `string` | no | CSS font family |
| `fontSize` | `number` (≥1) | no | Caption size |
| `captionWidth` | `number` (≥1) | no | Caption area width |
| `backgroundImage` | `string` | no | URL or data URI for frame background |

### Output controls

Used on create, from-template, and batch:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `format` | enum | no | `png` | `svg` \| `png` \| `jpg` \| `ascii` \| `unicode` |
| `quality` | `number` (0–1) | no | `0.92` | JPEG quality only |
| `response` | enum | no | `binary` | `binary` \| `base64` \| `dataurl` |

### Generate JSON envelope

Returned when `response` is `base64` or `dataurl`:

| Field | Type | Description |
|---|---|---|
| `format` | string | Output format |
| `encoding` | `base64` \| `dataurl` | How `data` is encoded |
| `mimeType` | string | e.g. `image/png` |
| `data` | string | Base64 payload or full data URL |
| `size` | number | Configured pixel size |
| `bytes` | number | Decoded byte length |

### User Object (public)

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | `string (uuid)` | no | User id |
| `name` | `string` | no | Display name |
| `email` | `string` | no | Unique email |
| `active` | `boolean` | no | Inactive keys are rejected |
| `createdAt` | `string (date-time)` | no | ISO timestamp |
| `updatedAt` | `string (date-time)` | no | ISO timestamp |
| `apiKey` | `string` | yes | **Only** on create / reveal / rotate |

### Batch status

| Status | Description |
|---|---|
| `queued` | Waiting / delayed |
| `processing` | Worker running |
| `completed` | Ready to download (`downloadUrl` present) |
| `failed` | Failed (`error` present) |

### Error Object

```json
{
  "error": "validation_error",
  "message": "Human-readable message",
  "field": "optional.dotted.path"
}
```

Other codes may include `details` or `errorCorrectionLevel` (for capacity errors).

### Built-in presets

| id | name |
|---|---|
| `plain` | Plain |
| `rounded-blue` | Rounded Blue |
| `classy-dark` | Classy Dark |
| `dots-coral` | Dots Coral |
| `framed-scan` | Framed Scan |

---

## Endpoints

---

### `GET /` — API info

Public. Returns service metadata and absolute links.

#### Response `200 OK`

```json
{
  "name": "QRForge",
  "version": "1.0.0",
  "description": "HTTP API for customizable QR code generation with styles, templates, batch, and playground.",
  "author": "Antônio Abrantes",
  "docs": "https://your-host/docs",
  "playground": "https://your-host/playground",
  "health": "https://your-host/health"
}
```

---

### `GET /health` — Health check

Public. Host root (not under `/v1`).

#### Response `200 OK`

```json
{
  "status": "ok",
  "service": "qrforge",
  "timestamp": "2026-07-13T13:00:00.000Z"
}
```

---

### `POST /v1/qrcodes` — Generate QR code

Builds a QR from raw `data` plus optional style. This is the main generation endpoint.

#### Request Body

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `data` | `string` (1–4296) | **yes** | — | Raw payload encoded in the QR |
| `format` | enum | no | `png` | `svg` \| `png` \| `jpg` \| `ascii` \| `unicode` |
| `quality` | `number` (0–1) | no | `0.92` | JPG only |
| `response` | enum | no | `binary` | `binary` \| `base64` \| `dataurl` |
| `size` | `integer` | no | `200` | Style — see StyleConfig |
| `margin` | `integer` | no | `0` | Style |
| `errorCorrectionLevel` | enum | no | `Q` | Style |
| `dots` | object | no | — | Style |
| `cornerSquares` | object | no | — | Style |
| `cornerDots` | object | no | — | Style |
| `background` | object | no | — | Style |
| `image` | Image | no | — | Center logo |
| `frame` | Frame | no | — | Caption frame |

#### Minimal Request Example

```json
{
  "data": "https://example.com",
  "format": "png",
  "response": "base64"
}
```

#### Full Request Example (colors + logo + frame)

```json
{
  "data": "https://tonilabs.space",
  "format": "png",
  "size": 512,
  "margin": 16,
  "errorCorrectionLevel": "H",
  "dots": { "shape": "rounded", "color": "#1a1a1a" },
  "cornerSquares": { "shape": "extra-rounded", "color": "#0055ff" },
  "cornerDots": { "shape": "dot", "color": "#0055ff" },
  "background": { "color": "#ffffff" },
  "image": {
    "href": "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png",
    "sizeRatio": 0.25,
    "margin": 4,
    "hideBackgroundDots": true
  },
  "frame": {
    "text": "Escaneie para pedir",
    "textPosition": "bottom",
    "textColor": "#000000",
    "backgroundColor": "#ffffff",
    "borderColor": "#000000",
    "borderWidth": 2,
    "borderRadius": 12,
    "padding": 16,
    "fontSize": 20
  },
  "response": "base64"
}
```

#### Response `200 OK` — `response: binary`

Raw bytes. Headers include `Content-Type` (e.g. `image/png`, `image/svg+xml`, `text/plain`) and `Content-Length`.

#### Response `200 OK` — `response: base64` | `dataurl`

```json
{
  "format": "png",
  "encoding": "base64",
  "mimeType": "image/png",
  "data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "size": 512,
  "bytes": 18402
}
```

#### Errors

| Code | Reason |
|---|---|
| `400` | Validation error |
| `401` | Missing/invalid API key |
| `422` | `capacity_exceeded` — payload too large for chosen EC level |

---

### `POST /v1/qrcodes/from-template` — Generate from data template

Encodes structured fields into the correct QR payload string, then generates with optional style.

#### Request Body

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `template` | enum | **yes** | — | `text` \| `url` \| `email` \| `phone` \| `sms` \| `wifi` \| `vcard` \| `location` \| `event` |
| `templateData` | object | **yes** | — | Fields for the chosen template (see tables below) |
| `style` | StyleConfig | no | — | Nested style (same fields as StyleConfig) |
| `format` | enum | no | `png` | Output format |
| `quality` | `number` | no | `0.92` | JPG quality |
| `response` | enum | no | `binary` | Encoding |

#### `templateData` by template

##### `text`

| Field | Type | Required |
|---|---|---|
| `text` | string | **yes** |

##### `url`

| Field | Type | Required | Notes |
|---|---|---|---|
| `url` | string | **yes** | If no scheme, `https://` is prepended |

##### `email`

| Field | Type | Required |
|---|---|---|
| `address` | string (email) | **yes** |
| `subject` | string | no |
| `body` | string | no |
| `cc` | string | no |
| `bcc` | string | no |

Encodes as `mailto:...`.

##### `phone`

| Field | Type | Required |
|---|---|---|
| `phone` | string | **yes** |

Encodes as `tel:...`.

##### `sms`

| Field | Type | Required |
|---|---|---|
| `phone` | string | **yes** |
| `message` | string | no |

Encodes as `SMSTO:phone:message`.

##### `wifi`

| Field | Type | Required |
|---|---|---|
| `ssid` | string | **yes** |
| `encryption` | `nopass` \| `WEP` \| `WPA` | **yes** |
| `password` | string | no |
| `hidden` | boolean | no |

Encodes as `WIFI:T:...;S:...;P:...;;`.

##### `vcard`

| Field | Type | Required |
|---|---|---|
| `firstName` | string | **yes*** |
| `lastName` | string | **yes*** |
| `organization` | string | no |
| `title` | string | no |
| `phone` | string | no |
| `email` | string (email) | no |
| `url` | string | no |
| `street` | string | no |
| `city` | string | no |
| `state` | string | no |
| `zip` | string | no |
| `country` | string | no |
| `version` | `2.1` \| `3.0` \| `4.0` | no (default `3.0`) |

\* At least one of `firstName` or `lastName` is required.

##### `location`

| Field | Type | Required |
|---|---|---|
| `latitude` | number | **yes** |
| `longitude` | number | **yes** |

Encodes as `geo:lat,lon`.

##### `event`

| Field | Type | Required |
|---|---|---|
| `title` | string | **yes** |
| `startTime` | string | **yes** | ISO datetime or iCal-like |
| `endTime` | string | no |
| `location` | string | no |

Encodes as a minimal `VCALENDAR` / `VEVENT`.

#### Full Request Example (WiFi)

```json
{
  "template": "wifi",
  "templateData": {
    "ssid": "SoftCom-Guest",
    "encryption": "WPA",
    "password": "senha-super-secreta",
    "hidden": false
  },
  "style": {
    "size": 400,
    "dots": { "shape": "classy-rounded", "color": "#000000" }
  },
  "format": "png",
  "response": "base64"
}
```

#### Request Example (vCard)

```json
{
  "template": "vcard",
  "templateData": {
    "firstName": "Antônio",
    "lastName": "Abrantes",
    "organization": "ToniLabs",
    "email": "antonio@exemplo.com",
    "phone": "+5511999999999",
    "version": "3.0"
  },
  "format": "png",
  "response": "base64"
}
```

#### Response

Same as `POST /v1/qrcodes` (binary bytes or JSON envelope).

#### Errors

| Code | Reason |
|---|---|
| `400` | Missing/invalid `templateData` fields |
| `401` | Auth |
| `422` | Capacity exceeded |

---

### `POST /v1/qrcodes/detect` — Detect payload type

Parses a raw QR payload string into `{ type, parsedData }`. Does **not** scan images.

#### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `string` (min 1) | **yes** | Raw payload |

#### Request Example

```json
{
  "data": "WIFI:T:WPA;S:MinhaRede;P:1234;;"
}
```

#### Response `200 OK`

```json
{
  "type": "wifi",
  "parsedData": {
    "ssid": "MinhaRede",
    "encryption": "WPA",
    "password": "1234",
    "hidden": false
  }
}
```

`type` is one of: `text` \| `url` \| `email` \| `phone` \| `sms` \| `wifi` \| `vcard` \| `location` \| `event` \| `unknown`.

---

### `POST /v1/qrcodes/random` — Random style config

Returns a random StyleConfig. **Does not generate an image.** Merge `config` into `POST /v1/qrcodes`.

#### Request Body

None.

#### Response `200 OK`

```json
{
  "config": {
    "size": 360,
    "margin": 2,
    "errorCorrectionLevel": "Q",
    "dots": { "shape": "rounded", "color": "#0f172a" },
    "cornerSquares": { "shape": "extra-rounded", "color": "#2563eb" },
    "cornerDots": { "shape": "dot", "color": "#2563eb" },
    "background": { "color": "#ffffff" }
  }
}
```

#### Usage

```
1. POST /v1/qrcodes/random → config
2. POST /v1/qrcodes with { data, ...config, format, response }
```

---

### `POST /v1/qrcodes/batch` — Enqueue batch job

Queues N QR generations with a **shared** style. Requires Redis + batch worker.

#### Request Body

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `items` | array | **yes** | — | 1–500 items (server may lower via `BATCH_MAX_ITEMS`) |
| `items[].id` | string (1–128) | **yes** | — | Stable id → ZIP filename / JSON item id |
| `items[].data` | string (1–4296) | **yes** | — | Payload for that QR |
| `style` | StyleConfig | no | — | Shared style for all items |
| `format` | enum | no | `png` | Shared format |
| `quality` | number | no | `0.92` | JPG |
| `response` | enum | no | `binary` | `binary` → ZIP download; `base64`/`dataurl` → JSON list (max ~200 items by default) |

#### Request Example

```json
{
  "style": {
    "size": 300,
    "dots": { "shape": "rounded", "color": "#111111" }
  },
  "format": "png",
  "response": "binary",
  "items": [
    { "id": "mesa-01", "data": "https://cardapio.com/mesa/1" },
    { "id": "mesa-02", "data": "https://cardapio.com/mesa/2" }
  ]
}
```

#### Response `202 Accepted`

```json
{
  "jobId": "42",
  "status": "queued",
  "statusUrl": "/v1/qrcodes/batch/42/status"
}
```

> **Always save `jobId`** for status and download.

#### Errors

| Code | Reason |
|---|---|
| `400` | `batch_too_large` or validation |
| `401` | Auth |

---

### `GET /v1/qrcodes/batch/:jobId/status` — Batch status

#### Path Parameter

| Parameter | Type | Required | Description |
|---|---|---|---|
| `jobId` | string | **yes** | From `POST /batch` |

#### Response `200 OK` (processing)

```json
{
  "jobId": "42",
  "status": "processing",
  "progress": 40
}
```

#### Response `200 OK` (completed)

```json
{
  "jobId": "42",
  "status": "completed",
  "progress": 100,
  "downloadUrl": "/v1/qrcodes/batch/42/download"
}
```

#### Response `200 OK` (failed)

```json
{
  "jobId": "42",
  "status": "failed",
  "progress": 0,
  "error": "reason string"
}
```

#### Errors

| Code | Reason |
|---|---|
| `404` | `job_not_found` |

---

### `GET /v1/qrcodes/batch/:jobId/download` — Download batch result

#### Path Parameter

| Parameter | Type | Required | Description |
|---|---|---|---|
| `jobId` | string | **yes** | Completed job id |

#### Response `200 OK` — job used `response: binary`

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="qr-batch-{jobId}.zip"`
- Body: ZIP of `{sanitizedId}.{ext}` files

#### Response `200 OK` — job used `response: base64` | `dataurl`

```json
{
  "jobId": "42",
  "items": [
    {
      "id": "mesa-01",
      "format": "png",
      "encoding": "base64",
      "mimeType": "image/png",
      "data": "iVBORw0KGgo...",
      "bytes": 9200
    }
  ]
}
```

#### Errors

| Code | Reason |
|---|---|
| `404` | `job_not_found` |
| `409` | `job_not_ready` — not completed yet |

---

### `GET /v1/presets` — List style presets

#### Response `200 OK`

```json
{
  "presets": [
    {
      "id": "rounded-blue",
      "name": "Rounded Blue",
      "config": {
        "size": 400,
        "margin": 2,
        "errorCorrectionLevel": "Q",
        "dots": { "shape": "rounded", "color": "#0f172a" },
        "cornerSquares": { "shape": "extra-rounded", "color": "#2563eb" },
        "cornerDots": { "shape": "dot", "color": "#2563eb" },
        "background": { "color": "#ffffff" }
      }
    }
  ]
}
```

---

### `GET /v1/presets/:id` — Get preset by id

#### Path Parameter

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | **yes** | e.g. `rounded-blue` |

#### Response `200 OK`

```json
{
  "id": "rounded-blue",
  "name": "Rounded Blue",
  "config": { }
}
```

#### Errors

| Code | Reason |
|---|---|
| `404` | `preset_not_found` |

#### Usage

```
GET /v1/presets/rounded-blue
→ merge config into POST /v1/qrcodes body + add data/format/response
```

---

### `POST /v1/users` — Create user (admin)

Creates a user and returns the **plaintext API key once** (also stored for reveal).

#### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string (1–255) | **yes** | Display name |
| `email` | string (email, max 255) | **yes** | Unique |

#### Request Example

```json
{
  "name": "Padaria do João",
  "email": "joao@padaria.com"
}
```

#### Response `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Padaria do João",
  "email": "joao@padaria.com",
  "active": true,
  "createdAt": "2026-07-13T10:00:00.000Z",
  "updatedAt": "2026-07-13T10:00:00.000Z",
  "apiKey": "qr_..."
}
```

> **Save `apiKey` immediately** for the consuming client. Prefer `reveal-key` only for recovery.

#### Errors

| Code | Reason |
|---|---|
| `403` | Not admin |
| `409` | `email_taken` |

---

### `GET /v1/users` — List users (admin)

Never includes `apiKey`.

#### Response `200 OK`

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Padaria do João",
      "email": "joao@padaria.com",
      "active": true,
      "createdAt": "2026-07-13T10:00:00.000Z",
      "updatedAt": "2026-07-13T10:00:00.000Z"
    }
  ]
}
```

---

### `GET /v1/users/:id` — Get user (admin)

#### Path Parameter

| Parameter | Type | Required |
|---|---|---|
| `id` | `string (uuid)` | **yes** |

#### Response `200 OK`

User Object without `apiKey`.

#### Errors

| Code | Reason |
|---|---|
| `404` | `user_not_found` |

---

### `GET /v1/users/:id/reveal-key` — Reveal API key (admin)

#### Response `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "apiKey": "qr_..."
}
```

---

### `POST /v1/users/:id/rotate-key` — Rotate API key (admin)

Invalidates the previous key and returns a new one.

#### Response `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "apiKey": "qr_new_..."
}
```

---

### `PATCH /v1/users/:id` — Update user (admin)

All body fields optional — send only what you change.

#### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string (1–255) | no | New name |
| `email` | string (email) | no | New email |
| `active` | boolean | no | Soft-disable (`false` rejects the key) |

#### Request Example (deactivate)

```json
{
  "active": false
}
```

#### Response `200 OK`

Updated User Object (no `apiKey`).

#### Errors

| Code | Reason |
|---|---|
| `404` | `user_not_found` |
| `409` | `email_taken` |

---

### `DELETE /v1/users/:id` — Delete user (admin)

Hard delete. Prefer `PATCH` with `active: false` for soft disable.

#### Response `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted": true
}
```

---

## Typical integration flows

### A — Single styled QR (image + custom colors)

```
1. Client needs QR for a URL with brand colors + logo
2. POST /v1/qrcodes
   ├─ data: "https://..."
   ├─ format: "png"
   ├─ errorCorrectionLevel: "H"
   ├─ dots / cornerSquares / cornerDots / background colors
   ├─ image.href: logo URL or data URI
   └─ response: "base64"  (or binary for file download)
3. Decode base64 → display or store
```

### B — Structured WiFi / vCard / Event

```
1. Collect structured fields from user
2. POST /v1/qrcodes/from-template
   ├─ template + templateData
   └─ optional style / format / response
3. Return image to user
```

### C — Batch menus / seats / inventory labels

```
1. POST /v1/qrcodes/batch  → jobId
2. Poll GET .../batch/{jobId}/status until completed
3. GET .../batch/{jobId}/download
   └─ ZIP (binary) or JSON items (base64/dataurl)
```

### D — Reuse preset

```
1. GET /v1/presets/rounded-blue → config
2. POST /v1/qrcodes { data, ...config, format, response }
```

### E — Provision a tenant API key

```
1. POST /v1/users (ADMIN_API_KEY) → { id, apiKey }
2. Store apiKey on the tenant; use as X-API-Key for QR routes
3. Soft-disable: PATCH { active: false }
4. Rotate: POST /users/{id}/rotate-key
```

---

## Environment variables (server)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis for batch queue (default `redis://localhost:6379`) |
| `ADMIN_API_KEY` | Admin key (≥32 chars) |
| `PORT` / `HOST` | HTTP bind (default `3000` / `0.0.0.0`) |
| `CORS_ORIGIN` | `*` or comma-separated origins |
| `RATE_LIMIT_MAX` | Requests per window (default `60`) |
| `RATE_LIMIT_TIME_WINDOW_MS` | Window ms (default `60000`) |
| `BATCH_MAX_ITEMS` | Hard cap for batch size (default `500`) |
| `BATCH_BASE64_MAX_ITEMS` | Cap for base64/dataurl batches (default `200`) |
| `IMAGE_FETCH_TIMEOUT_MS` | Logo/frame image fetch timeout (default `5000`) |
| `IMAGE_FETCH_MAX_BYTES` | Max image fetch size (default `2097152`) |

### Client-side env (consuming service)

| Variable | Description |
|---|---|
| `QRFORGE_BASE_URL` | Host without trailing slash |
| `QRFORGE_API_KEY` | User or admin key for generation |
| `QRFORGE_ADMIN_API_KEY` | Only if the client manages users |

---

## Implementation notes

### Choosing `response`

| Need | Use |
|---|---|
| Save/stream a file | `binary` |
| Embed in JSON API / store in DB | `base64` |
| Drop into `<img src>` | `dataurl` |

### Logos and scannability

Always set `errorCorrectionLevel: "H"` when using `image`. Keep `sizeRatio` modest (≈0.15–0.3). Prefer high-contrast `dots.color` vs `background.color`.

### Colors

Only `#RGB`, `#RRGGBB`, or the literal `"transparent"`. Invalid colors → `400 validation_error`.

### Body size

HTTP body limit is **2 MiB**. Prefer URL `href` for logos over huge inline data URIs when possible.

### Rate limiting

Keyed by `X-API-Key` when present, otherwise by IP. Defaults: 60 req / 60s (configurable).

### Idempotency

There is **no** idempotency key. Identical `POST /qrcodes` calls produce independent responses. Batch jobs always get a new `jobId`.

### ASCII / Unicode formats

`format: ascii` or `unicode` returns text art. Prefer `response: binary` (plain text body). Useful for terminals/logs, not for print branding.

### Soft vs hard user disable

- Soft: `PATCH /v1/users/:id` with `{ "active": false }` — key rejected with 401
- Hard: `DELETE /v1/users/:id` — row removed

---

## Curl smoke test

```bash
BASE=https://your-host
KEY=your-api-key

curl -s "$BASE/health"

curl -s "$BASE/v1/qrcodes" \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":"https://example.com","format":"png","response":"base64"}'
```

More recipes: see repository `docs/CURLS.md`.
