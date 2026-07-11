const $ = (id) => document.getElementById(id)

const baseUrlInput = $('baseUrl')
const apiKeyInput = $('apiKey')
const statusEl = $('status')
const previewEl = $('preview')
const generateBtn = $('generate')

const COLOR_PAIRS = [
  ['dotColor', 'dotColorHex'],
  ['csColor', 'csColorHex'],
  ['cdColor', 'cdColorHex'],
  ['bgColor', 'bgColorHex'],
]

function detectBaseUrl() {
  const { origin, hostname } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return origin
  }
  return origin
}

baseUrlInput.value = detectBaseUrl()

/** Accepts #RGB or #RRGGBB (with or without #). Returns lowercase #rrggbb or null. */
function normalizeHex(raw) {
  let v = String(raw || '').trim()
  if (!v) return null
  if (!v.startsWith('#')) v = `#${v}`
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return null
  return v.toLowerCase()
}

function setColorPair(colorId, hex) {
  const normalized = normalizeHex(hex)
  if (!normalized) return false
  const colorEl = $(colorId)
  const hexEl = $(`${colorId}Hex`)
  colorEl.value = normalized
  if (hexEl) hexEl.value = normalized
  return true
}

function wireColorPair(colorId, hexId) {
  const colorEl = $(colorId)
  const hexEl = $(hexId)

  colorEl.addEventListener('input', () => {
    hexEl.value = colorEl.value
  })

  hexEl.addEventListener('input', () => {
    const normalized = normalizeHex(hexEl.value)
    if (normalized) colorEl.value = normalized
  })

  hexEl.addEventListener('blur', () => {
    const normalized = normalizeHex(hexEl.value)
    if (normalized) {
      hexEl.value = normalized
      colorEl.value = normalized
    } else {
      hexEl.value = colorEl.value
    }
  })

  hexEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault()
      hexEl.blur()
    }
  })
}

for (const [colorId, hexId] of COLOR_PAIRS) {
  wireColorPair(colorId, hexId)
}

function showStatus(msg, ok = false) {
  statusEl.hidden = !msg
  statusEl.textContent = msg || ''
  statusEl.classList.toggle('ok', Boolean(ok && msg))
}

function buildBody() {
  const body = {
    data: $('data').value.trim(),
    size: Number($('size').value),
    margin: Number($('margin').value),
    errorCorrectionLevel: $('ec').value,
    format: $('format').value,
    response: $('response').value,
    dots: { shape: $('dotShape').value, color: $('dotColor').value },
    cornerSquares: { shape: $('csShape').value, color: $('csColor').value },
    cornerDots: { shape: $('cdShape').value, color: $('cdColor').value },
    background: { color: $('bgColor').value },
  }
  const logo = $('logoUrl').value.trim()
  if (logo) {
    body.image = { href: logo, sizeRatio: 0.22, hideBackgroundDots: true }
  }
  return body
}

function buildCurl(body) {
  const base = baseUrlInput.value.replace(/\/$/, '')
  const key = apiKeyInput.value.trim() || 'YOUR_API_KEY'
  return `curl -X POST '${base}/v1/qrcodes' \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-API-Key: ${key}' \\\n  -d '${JSON.stringify(body)}'`
}

function syncGenerateEnabled() {
  generateBtn.disabled = !apiKeyInput.value.trim() || !$('data').value.trim()
}

apiKeyInput.addEventListener('input', syncGenerateEnabled)
$('data').addEventListener('input', syncGenerateEnabled)
syncGenerateEnabled()

$('copyCurl').addEventListener('click', async () => {
  await navigator.clipboard.writeText(buildCurl(buildBody()))
  showStatus('cURL copiado.', true)
  setTimeout(() => showStatus(''), 1500)
})

$('randomize').addEventListener('click', async () => {
  const key = apiKeyInput.value.trim()
  if (!key) {
    showStatus('Informe a API Key para randomizar.')
    return
  }
  try {
    const res = await fetch(`${baseUrlInput.value.replace(/\/$/, '')}/v1/qrcodes/random`, {
      method: 'POST',
      headers: { 'X-API-Key': key },
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Falha ao randomizar')
    const c = json.config
    if (c.size) $('size').value = c.size
    if (c.margin != null) $('margin').value = c.margin
    if (c.errorCorrectionLevel) $('ec').value = c.errorCorrectionLevel
    if (c.dots?.shape) $('dotShape').value = c.dots.shape
    if (c.dots?.color) setColorPair('dotColor', c.dots.color)
    if (c.cornerSquares?.shape) $('csShape').value = c.cornerSquares.shape
    if (c.cornerSquares?.color) setColorPair('csColor', c.cornerSquares.color)
    if (c.cornerDots?.shape) $('cdShape').value = c.cornerDots.shape
    if (c.cornerDots?.color) setColorPair('cdColor', c.cornerDots.color)
    if (c.background?.color && c.background.color !== 'transparent') {
      setColorPair('bgColor', c.background.color)
    }
    showStatus('Estilo randomizado.', true)
  } catch (err) {
    showStatus(err.message || String(err))
  }
})

generateBtn.addEventListener('click', async () => {
  showStatus('')
  previewEl.innerHTML = ''
  const body = buildBody()
  const key = apiKeyInput.value.trim()
  if (!key) {
    showStatus('API Key obrigatória.')
    return
  }

  try {
    const res = await fetch(`${baseUrlInput.value.replace(/\/$/, '')}/v1/qrcodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key,
      },
      body: JSON.stringify(body),
    })

    const contentType = res.headers.get('content-type') || ''
    if (!res.ok) {
      const err = contentType.includes('json') ? await res.json() : { message: await res.text() }
      throw new Error(err.message || `HTTP ${res.status}`)
    }

    if (contentType.includes('application/json')) {
      const json = await res.json()
      if (json.encoding === 'dataurl' || String(json.data || '').startsWith('data:')) {
        const img = document.createElement('img')
        img.alt = 'QR preview'
        img.src = json.data.startsWith('data:')
          ? json.data
          : `data:${json.mimeType};base64,${json.data}`
        previewEl.appendChild(img)
      } else if (json.format === 'svg') {
        const svg = atob(json.data)
        previewEl.innerHTML = svg
      } else {
        const img = document.createElement('img')
        img.alt = 'QR preview'
        img.src = `data:${json.mimeType};base64,${json.data}`
        previewEl.appendChild(img)
      }
      return
    }

    if (contentType.includes('text/plain')) {
      const text = await res.text()
      const pre = document.createElement('pre')
      pre.textContent = text
      previewEl.appendChild(pre)
      return
    }

    const blob = await res.blob()
    if (contentType.includes('svg')) {
      previewEl.innerHTML = await blob.text()
    } else {
      const img = document.createElement('img')
      img.alt = 'QR preview'
      img.src = URL.createObjectURL(blob)
      previewEl.appendChild(img)
    }
  } catch (err) {
    showStatus(err.message || String(err))
  }
})
