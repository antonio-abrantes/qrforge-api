import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
])

function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return true
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('192.168.')) return true
  if (ip.startsWith('169.254.')) return true
  const m = /^172\.(\d+)\./.exec(ip)
  if (m) {
    const second = Number(m[1])
    if (second >= 16 && second <= 31) return true
  }
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true
  return false
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new AppError('Invalid image URL', 400, 'invalid_image_url')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError('Only http(s) image URLs are allowed', 400, 'invalid_image_url')
  }
  if (url.username || url.password) {
    throw new AppError('Image URLs with credentials are not allowed', 400, 'invalid_image_url')
  }

  const hostname = url.hostname
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new AppError('Localhost image URLs are blocked', 400, 'ssrf_blocked')
  }

  const literal = isIP(hostname)
  if (literal) {
    if (isPrivateIp(hostname)) {
      throw new AppError('Private IP image URLs are blocked', 400, 'ssrf_blocked')
    }
    return url
  }

  const records = await lookup(hostname, { all: true })
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new AppError('Image host resolves to a private IP', 400, 'ssrf_blocked')
    }
  }
  return url
}

export async function fetchImageAsDataUri(href: string): Promise<string> {
  if (href.startsWith('data:')) {
    if (!href.startsWith('data:image/')) {
      throw new AppError('Only image data URIs are allowed', 400, 'invalid_image_url')
    }
    if (Buffer.byteLength(href, 'utf8') > env().IMAGE_FETCH_MAX_BYTES * 1.4) {
      throw new AppError('Image data URI too large', 400, 'image_too_large')
    }
    return href
  }

  const url = await assertSafeUrl(href)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env().IMAGE_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { Accept: 'image/*' },
    })
    if (!res.ok) {
      throw new AppError(`Failed to fetch image (${res.status})`, 400, 'image_fetch_failed')
    }
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
    if (!ALLOWED_MIME.has(contentType)) {
      throw new AppError(`Unsupported image mime type: ${contentType}`, 400, 'invalid_image_type')
    }
    const len = Number(res.headers.get('content-length') ?? 0)
    if (len > env().IMAGE_FETCH_MAX_BYTES) {
      throw new AppError('Image too large', 400, 'image_too_large')
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > env().IMAGE_FETCH_MAX_BYTES) {
      throw new AppError('Image too large', 400, 'image_too_large')
    }
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch (err) {
    if (err instanceof AppError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new AppError('Image fetch timed out', 400, 'image_fetch_timeout')
    }
    throw new AppError('Image fetch failed', 400, 'image_fetch_failed')
  } finally {
    clearTimeout(timeout)
  }
}
