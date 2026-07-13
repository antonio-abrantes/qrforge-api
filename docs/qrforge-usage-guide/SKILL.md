---
name: qrforge-usage-guide
description: >-
  Integrates with the QRForge HTTP API to generate styled QR codes, templates
  (wifi, vcard, email, sms, event…), presets, batch jobs, and admin user/API-key
  management. Use when implementing QRForge endpoints, generating QR codes with
  custom colors/logo/frame, calling POST /qrcodes, from-template, batch, presets,
  or users, or when the user mentions QRForge, qr-api, or QR code generation API.
---

# QRForge Usage Guide

> **Full standalone reference** (non-skill environments): [USAGE_GUIDE.md](USAGE_GUIDE.md)

## When to use this skill

Load this skill before writing any client code that calls QRForge. Prefer the
decision tree below, then open [USAGE_GUIDE.md](USAGE_GUIDE.md) for the exact
request/response of the chosen endpoint.

## Configuration

| Field | Value |
|---|---|
| **Base URL** | `[YOUR_QRFORGE_BASE_URL]` (e.g. `https://qr.example.com` or `http://localhost:3000`) |
| **API prefix** | `/v1` for product routes |
| **API Version** | 1.0.0 |
| **Swagger UI** | `{BASE}/docs` |
| **OpenAPI JSON** | `{BASE}/docs/json` |
| **Playground** | `{BASE}/playground` |
| **Auth header** | `X-API-Key: [YOUR_API_KEY]` |

Product paths are `/v1/...`. OpenAPI documents paths **without** `/v1` (server = `/v1`).

## Auth rules

| Route group | Key required |
|---|---|
| Public: `/`, `/health`, `/docs*`, `/playground*`, `/assets*` | none |
| `/v1/qrcodes*`, `/v1/presets*` | admin **or** user key |
| `/v1/users*` | **admin key only** |

```
X-API-Key: [YOUR_API_KEY]
```

Errors: `401 missing_api_key` / `invalid_api_key` · `403 forbidden` (user key on admin route).

## Decision tree — pick the endpoint

```
Need to generate a QR?
├─ Raw payload string already known?
│  └─ POST /v1/qrcodes
├─ Structured data (wifi, vcard, email, sms, url, phone, text, location, event)?
│  └─ POST /v1/qrcodes/from-template
├─ Many QRs at once (shared style)?
│  └─ POST /v1/qrcodes/batch → poll status → download
├─ Reuse a ready-made style?
│  └─ GET /v1/presets or GET /v1/presets/:id  then merge into POST /qrcodes
├─ Want a random style (no image)?
│  └─ POST /v1/qrcodes/random  → use `config` on POST /qrcodes
└─ Detect type of an existing QR payload string?
   └─ POST /v1/qrcodes/detect

Need user / API key management?
└─ /v1/users* (ADMIN_API_KEY only)
```

## Endpoint index

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | public | API info |
| `GET` | `/health` | public | Liveness |
| `POST` | `/v1/qrcodes` | key | Generate QR from `data` + style |
| `POST` | `/v1/qrcodes/from-template` | key | Encode template → generate |
| `POST` | `/v1/qrcodes/detect` | key | Detect payload type |
| `POST` | `/v1/qrcodes/random` | key | Random style config |
| `POST` | `/v1/qrcodes/batch` | key | Enqueue batch (`202`) |
| `GET` | `/v1/qrcodes/batch/:jobId/status` | key | Batch status |
| `GET` | `/v1/qrcodes/batch/:jobId/download` | key | ZIP or JSON result |
| `GET` | `/v1/presets` | key | List presets |
| `GET` | `/v1/presets/:id` | key | Get preset |
| `POST` | `/v1/users` | admin | Create user (+ plaintext key) |
| `GET` | `/v1/users` | admin | List users |
| `GET` | `/v1/users/:id` | admin | Get user |
| `GET` | `/v1/users/:id/reveal-key` | admin | Reveal key |
| `POST` | `/v1/users/:id/rotate-key` | admin | Rotate key |
| `PATCH` | `/v1/users/:id` | admin | Update user |
| `DELETE` | `/v1/users/:id` | admin | Hard-delete user |

## Shared style model (`StyleConfig`)

Used by `POST /qrcodes` (flat on body), `from-template.style`, and `batch.style`.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `size` | `integer` 64–4096 | no | `200` | Pixel size |
| `margin` | `integer` 0–100 | no | `0` | Quiet zone |
| `errorCorrectionLevel` | `L\|M\|Q\|H` | no | `Q` | Use `H` with logos |
| `dots` | `{ shape?, color? }` | no | square / `#000000` | See shapes below |
| `cornerSquares` | `{ shape?, color? }` | no | square / `#000000` | |
| `cornerDots` | `{ shape?, color? }` | no | square / `#000000` | |
| `background` | `{ color? }` | no | `#ffffff` | |
| `image` | object | no | — | Center logo |
| `frame` | object | no | — | Caption frame |

**Colors:** `#RGB`, `#RRGGBB`, or `"transparent"`.

**Dot shapes:** `square` · `rounded` · `extra-rounded` · `classy` · `classy-rounded` · `dots`  
**Corner square shapes:** `square` · `rounded` · `extra-rounded` · `dot`  
**Corner dot shapes:** `square` · `rounded` · `dot`

### `image` (logo)

| Field | Type | Required | Default |
|---|---|---|---|
| `href` | string (URL or data URI) | **yes** | — |
| `sizeRatio` | number 0.05–0.5 | no | lib default |
| `margin` | number ≥0 | no | — |
| `hideBackgroundDots` | boolean | no | — |
| `crossOrigin` | `anonymous` \| `use-credentials` | no | — |

### `frame`

| Field | Type | Required |
|---|---|---|
| `text` | string | **yes** |
| `textPosition` | `top` \| `bottom` \| `left` \| `right` | **yes** |
| `textColor`, `backgroundColor`, `borderColor` | hex / transparent | no |
| `borderWidth`, `borderRadius`, `padding`, `fontSize`, `captionWidth` | number | no |
| `fontFamily` | string | no |
| `backgroundImage` | string (URL/data URI) | no |

## Output controls (create / template / batch)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `format` | `svg` \| `png` \| `jpg` \| `ascii` \| `unicode` | no | `png` | |
| `quality` | number 0–1 | no | `0.92` | JPG only |
| `response` | `binary` \| `base64` \| `dataurl` | no | `binary` | |

**Response behavior**

- `binary` → raw image/text bytes (`Content-Type` = mime)
- `base64` / `dataurl` → JSON:

```json
{
  "format": "png",
  "encoding": "base64",
  "mimeType": "image/png",
  "data": "...",
  "size": 400,
  "bytes": 12345
}
```

## Quick recipes

### Custom colors + logo

```http
POST /v1/qrcodes
X-API-Key: [KEY]
Content-Type: application/json

{
  "data": "https://example.com",
  "format": "png",
  "size": 512,
  "errorCorrectionLevel": "H",
  "dots": { "shape": "rounded", "color": "#1a1a1a" },
  "cornerSquares": { "shape": "extra-rounded", "color": "#0055ff" },
  "cornerDots": { "shape": "dot", "color": "#0055ff" },
  "background": { "color": "#ffffff" },
  "image": {
    "href": "https://example.com/logo.png",
    "sizeRatio": 0.25,
    "hideBackgroundDots": true
  },
  "response": "base64"
}
```

### WiFi template

```http
POST /v1/qrcodes/from-template
```

Body: `template: "wifi"`, `templateData: { ssid, encryption: "WPA"|"WEP"|"nopass", password?, hidden? }`, optional `style`, `format`, `response`.

### Batch flow

```
1. POST /v1/qrcodes/batch  → 202 { jobId, statusUrl }
2. GET  /v1/qrcodes/batch/{jobId}/status  until status=completed
3. GET  /v1/qrcodes/batch/{jobId}/download
   · response=binary → application/zip
   · response=base64|dataurl → JSON { jobId, items[] }
```

Limits: schema max 500 items; env may lower (`BATCH_MAX_ITEMS`, `BATCH_BASE64_MAX_ITEMS` default 200 for base64/dataurl).

## Templates cheat sheet

| `template` | Required `templateData` | Optional |
|---|---|---|
| `text` | `text` | — |
| `url` | `url` | (https prepended if no scheme) |
| `email` | `address` | `subject`, `body`, `cc`, `bcc` |
| `phone` | `phone` | — |
| `sms` | `phone` | `message` |
| `wifi` | `ssid`, `encryption` | `password`, `hidden` |
| `vcard` | `firstName` **or** `lastName` | org, title, phone, email, url, address fields, `version` |
| `location` | `latitude`, `longitude` | — |
| `event` | `title`, `startTime` | `location`, `endTime` |

## Presets (built-in)

`plain` · `rounded-blue` · `classy-dark` · `dots-coral` · `framed-scan`

Merge `preset.config` into create body (add `data` / `format` / `response`).

## Agent implementation checklist

```
- [ ] Set BASE_URL + X-API-Key
- [ ] Choose endpoint via decision tree
- [ ] Map StyleConfig fields (colors, shapes, image, frame)
- [ ] Choose format + response encoding
- [ ] For templates: fill required templateData only
- [ ] For batch: poll status before download; save jobId
- [ ] Handle 400 validation_error, 401/403, 422 capacity_exceeded
- [ ] Read USAGE_GUIDE.md for full examples if unsure
```

## Errors (common)

| Code | `error` | Meaning |
|---|---|---|
| 400 | `validation_error` | Bad body / field |
| 401 | `missing_api_key` / `invalid_api_key` | Auth |
| 403 | `forbidden` | Need admin key |
| 404 | `preset_not_found` / `job_not_found` / `user_not_found` | Missing resource |
| 409 | `email_taken` / `job_not_ready` | Conflict |
| 422 | `capacity_exceeded` | Payload too large for EC level |

```json
{ "error": "validation_error", "message": "...", "field": "optional.path" }
```

## Additional resources

- Complete endpoint reference with all examples: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- Project OpenAPI live: `{BASE}/docs`
- Repo curl cookbook: `../CURLS.md`
