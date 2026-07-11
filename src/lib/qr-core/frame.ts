import type { FrameTextPosition } from './types.js'
import { escapeAttr } from './svg-render.js'

export interface FrameOptions {
  text: string
  textPosition: FrameTextPosition
  textColor?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  padding?: number
  fontFamily?: string
  fontSize?: number
  captionWidth?: number
  backgroundImage?: string
}

export function renderFramed(
  qrBody: string,
  qrWidth: number,
  qrHeight: number,
  frame: FrameOptions,
): { body: string; width: number; height: number } {
  const padding = frame.padding ?? 16
  const borderWidth = frame.borderWidth ?? 2
  const borderRadius = frame.borderRadius ?? 12
  const fontSize = frame.fontSize ?? 20
  const fontFamily = frame.fontFamily ?? 'sans-serif'
  const textColor = frame.textColor ?? '#000000'
  const backgroundColor = frame.backgroundColor ?? '#ffffff'
  const borderColor = frame.borderColor ?? '#000000'
  const captionWidth = frame.captionWidth ?? Math.max(80, Math.round(fontSize * 6))
  const text = frame.text

  const captionHeight = Math.round(fontSize * 1.8)
  const pos = frame.textPosition

  let contentW = qrWidth
  let contentH = qrHeight
  let qrOffsetX = padding + borderWidth
  let qrOffsetY = padding + borderWidth
  let textX = 0
  let textY = 0
  let textAnchor = 'middle'
  let writingMode: string | undefined

  if (pos === 'top') {
    contentH = qrHeight + captionHeight + padding
    qrOffsetY = padding + borderWidth + captionHeight + padding
    textX = borderWidth + padding + qrWidth / 2
    textY = borderWidth + padding + fontSize
  } else if (pos === 'bottom') {
    contentH = qrHeight + captionHeight + padding
    textX = borderWidth + padding + qrWidth / 2
    textY = borderWidth + padding + qrHeight + padding + fontSize
  } else if (pos === 'left') {
    contentW = qrWidth + captionWidth + padding
    qrOffsetX = borderWidth + padding + captionWidth + padding
    textX = borderWidth + padding + captionWidth / 2
    textY = borderWidth + padding + qrHeight / 2
    writingMode = 'vertical-rl'
  } else {
    contentW = qrWidth + captionWidth + padding
    textX = borderWidth + padding + qrWidth + padding + captionWidth / 2
    textY = borderWidth + padding + qrHeight / 2
    writingMode = 'vertical-rl'
  }

  const width = contentW + (padding + borderWidth) * 2
  const height = contentH + (padding + borderWidth) * 2

  const parts: string[] = []

  if (frame.backgroundImage) {
    parts.push(
      `<image href="${escapeAttr(frame.backgroundImage)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`,
    )
  } else if (backgroundColor !== 'transparent') {
    parts.push(
      `<rect width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="${escapeAttr(backgroundColor)}"/>`,
    )
  }

  if (borderWidth > 0) {
    parts.push(
      `<rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${width - borderWidth}" height="${height - borderWidth}" rx="${borderRadius}" ry="${borderRadius}" fill="none" stroke="${escapeAttr(borderColor)}" stroke-width="${borderWidth}"/>`,
    )
  }

  parts.push(`<g transform="translate(${qrOffsetX}, ${qrOffsetY})">${qrBody}</g>`)

  const wm = writingMode ? ` writing-mode="${writingMode}"` : ''
  parts.push(
    `<text x="${textX}" y="${textY}" text-anchor="${textAnchor}" dominant-baseline="middle" fill="${escapeAttr(textColor)}" font-family="${escapeAttr(fontFamily)}" font-size="${fontSize}"${wm}>${escapeText(text)}</text>`,
  )

  return { body: parts.join(''), width, height }
}

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
