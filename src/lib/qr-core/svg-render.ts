import {
  createMatrix,
  getFinderOrigins,
  isFinderInner,
  isFinderOuter,
  isInFinderPattern,
  type QRMatrix,
} from './matrix.js'
import { getNeighbors } from './neighbors.js'
import { cornerDotPath, cornerSquarePath, modulePath } from './corners.js'
import { resolveConfig, type QRCodeConfig, type ResolvedQRCodeConfig } from './types.js'
import { renderFramed } from './frame.js'

export interface SvgRenderResult {
  svg: string
  width: number
  height: number
  matrix: QRMatrix
  config: ResolvedQRCodeConfig
}

export function renderQrFragment(
  matrix: QRMatrix,
  config: ResolvedQRCodeConfig,
  options?: { imageHref?: string; imageDataUri?: string },
): { body: string; width: number; height: number; moduleSize: number } {
  const count = matrix.length
  const moduleSize = config.size / (count + config.margin * 2)
  const quiet = config.margin * moduleSize
  const qrSize = count * moduleSize
  const width = config.size
  const height = config.size

  const parts: string[] = []

  if (config.background.color !== 'transparent') {
    parts.push(
      `<rect width="${width}" height="${height}" fill="${escapeAttr(config.background.color)}"/>`,
    )
  }

  const logoHref = options?.imageDataUri ?? options?.imageHref ?? config.image?.href
  const hideDots = config.image?.hideBackgroundDots !== false && Boolean(logoHref)
  const logoRatio = config.image?.sizeRatio ?? 0.25
  const logoMargin = (config.image?.margin ?? 0) * moduleSize
  const logoSize = qrSize * logoRatio
  const logoX = quiet + (qrSize - logoSize) / 2
  const logoY = quiet + (qrSize - logoSize) / 2
  const clearX0 = logoX - logoMargin
  const clearY0 = logoY - logoMargin
  const clearX1 = logoX + logoSize + logoMargin
  const clearY1 = logoY + logoSize + logoMargin

  const inLogoClear = (x: number, y: number) =>
    hideDots && x + moduleSize > clearX0 && x < clearX1 && y + moduleSize > clearY0 && y < clearY1

  const dataPaths: string[] = []
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!matrix[row]![col]) continue
      if (isInFinderPattern(row, col, count)) continue
      const x = quiet + col * moduleSize
      const y = quiet + row * moduleSize
      if (inLogoClear(x, y)) continue
      const n = getNeighbors(matrix, row, col)
      dataPaths.push(modulePath(x, y, moduleSize, config.dots.shape, n))
    }
  }
  if (dataPaths.length) {
    parts.push(
      `<path fill="${escapeAttr(config.dots.color)}" d="${dataPaths.join('')}"/>`,
    )
  }

  const squarePaths: string[] = []
  const dotPaths: string[] = []
  for (const origin of getFinderOrigins(count)) {
    const x = quiet + origin.col * moduleSize
    const y = quiet + origin.row * moduleSize
    squarePaths.push(cornerSquarePath(x, y, moduleSize, config.cornerSquares.shape))
    // Only draw finder cells that are actually dark for inner/outer fidelity
    let hasOuter = false
    let hasInner = false
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const rr = origin.row + r
        const cc = origin.col + c
        if (!matrix[rr]?.[cc]) continue
        if (isFinderOuter(rr, cc, count)) hasOuter = true
        if (isFinderInner(rr, cc, count)) hasInner = true
      }
    }
    if (hasOuter) {
      // already pushed square frame
    }
    if (hasInner) {
      dotPaths.push(cornerDotPath(x, y, moduleSize, config.cornerDots.shape))
    }
  }
  if (squarePaths.length) {
    parts.push(
      `<path fill-rule="evenodd" fill="${escapeAttr(config.cornerSquares.color)}" d="${squarePaths.join('')}"/>`,
    )
  }
  if (dotPaths.length) {
    parts.push(
      `<path fill="${escapeAttr(config.cornerDots.color)}" d="${dotPaths.join('')}"/>`,
    )
  }

  if (logoHref) {
    parts.push(
      `<image href="${escapeAttr(logoHref)}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`,
    )
  }

  return { body: parts.join(''), width, height, moduleSize }
}

export function wrapAsSvg(body: string, width: number, height: number): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    body,
    `</svg>`,
  ].join('')
}

export function renderToSvg(
  config: QRCodeConfig,
  options?: { imageDataUri?: string },
): SvgRenderResult {
  const resolved = resolveConfig(config)
  const matrix = createMatrix(resolved.data, resolved.errorCorrectionLevel)
  const fragment = renderQrFragment(matrix, resolved, {
    imageDataUri: options?.imageDataUri,
  })

  let body = fragment.body
  let width = fragment.width
  let height = fragment.height

  if (resolved.frame) {
    const framed = renderFramed(body, width, height, resolved.frame)
    body = framed.body
    width = framed.width
    height = framed.height
  }

  return {
    svg: wrapAsSvg(body, width, height),
    width,
    height,
    matrix,
    config: resolved,
  }
}

export function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
