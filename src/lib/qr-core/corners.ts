import type { CornerDotShape, CornerSquareShape, DotShape } from './types.js'
import type { NeighborFlags } from './neighbors.js'

function esc(n: number): string {
  return Number(n.toFixed(3)).toString()
}

/** Draw a single data module path based on shape + neighbors. */
export function modulePath(
  x: number,
  y: number,
  size: number,
  shape: DotShape,
  n: NeighborFlags,
): string {
  switch (shape) {
    case 'dots': {
      const r = size / 2
      return circlePath(x + r, y + r, r * 0.9)
    }
    case 'rounded':
      return roundedRectPath(x, y, size, size, size * 0.25)
    case 'extra-rounded':
      return continuousRoundedPath(x, y, size, n, 1)
    case 'classy':
      return classyPath(x, y, size, n, false)
    case 'classy-rounded':
      return classyPath(x, y, size, n, true)
    case 'square':
    default:
      return `M${esc(x)} ${esc(y)}h${esc(size)}v${esc(size)}h${esc(-size)}z`
  }
}

export function cornerSquarePath(
  x: number,
  y: number,
  moduleSize: number,
  shape: CornerSquareShape,
): string {
  const outer = moduleSize * 7
  const stroke = moduleSize
  switch (shape) {
    case 'dot': {
      const cx = x + outer / 2
      const cy = y + outer / 2
      const r = outer / 2 - stroke / 2
      return ringPath(cx, cy, r, stroke)
    }
    case 'rounded':
      return roundedFramePath(x, y, outer, outer, stroke, moduleSize * 1.5)
    case 'extra-rounded':
      return roundedFramePath(x, y, outer, outer, stroke, moduleSize * 2.5)
    case 'square':
    default:
      return squareFramePath(x, y, outer, outer, stroke)
  }
}

export function cornerDotPath(
  x: number,
  y: number,
  moduleSize: number,
  shape: CornerDotShape,
): string {
  const originX = x + moduleSize * 2
  const originY = y + moduleSize * 2
  const size = moduleSize * 3
  switch (shape) {
    case 'dot': {
      const r = size / 2
      return circlePath(originX + r, originY + r, r)
    }
    case 'rounded':
      return roundedRectPath(originX, originY, size, size, moduleSize * 0.75)
    case 'square':
    default:
      return `M${esc(originX)} ${esc(originY)}h${esc(size)}v${esc(size)}h${esc(-size)}z`
  }
}

function circlePath(cx: number, cy: number, r: number): string {
  return [
    `M${esc(cx - r)} ${esc(cy)}`,
    `a${esc(r)} ${esc(r)} 0 1 0 ${esc(r * 2)} 0`,
    `a${esc(r)} ${esc(r)} 0 1 0 ${esc(-r * 2)} 0`,
    'z',
  ].join('')
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): string {
  const r = Math.min(radius, w / 2, h / 2)
  return [
    `M${esc(x + r)} ${esc(y)}`,
    `h${esc(w - 2 * r)}`,
    `a${esc(r)} ${esc(r)} 0 0 1 ${esc(r)} ${esc(r)}`,
    `v${esc(h - 2 * r)}`,
    `a${esc(r)} ${esc(r)} 0 0 1 ${esc(-r)} ${esc(r)}`,
    `h${esc(-(w - 2 * r))}`,
    `a${esc(r)} ${esc(r)} 0 0 1 ${esc(-r)} ${esc(-r)}`,
    `v${esc(-(h - 2 * r))}`,
    `a${esc(r)} ${esc(r)} 0 0 1 ${esc(r)} ${esc(-r)}`,
    'z',
  ].join('')
}

function continuousRoundedPath(
  x: number,
  y: number,
  size: number,
  n: NeighborFlags,
  intensity: number,
): string {
  const r = (size / 2) * intensity
  const corners = {
    tl: !n.top && !n.left,
    tr: !n.top && !n.right,
    br: !n.bottom && !n.right,
    bl: !n.bottom && !n.left,
  }
  const tl = corners.tl ? r : 0
  const tr = corners.tr ? r : 0
  const br = corners.br ? r : 0
  const bl = corners.bl ? r : 0

  return [
    `M${esc(x + tl)} ${esc(y)}`,
    `h${esc(size - tl - tr)}`,
    tr ? `a${esc(tr)} ${esc(tr)} 0 0 1 ${esc(tr)} ${esc(tr)}` : `h${esc(tr)}v${esc(tr)}`,
    `v${esc(size - tr - br)}`,
    br ? `a${esc(br)} ${esc(br)} 0 0 1 ${esc(-br)} ${esc(br)}` : `v${esc(br)}h${esc(-br)}`,
    `h${esc(-(size - br - bl))}`,
    bl ? `a${esc(bl)} ${esc(bl)} 0 0 1 ${esc(-bl)} ${esc(-bl)}` : `h${esc(-bl)}v${esc(-bl)}`,
    `v${esc(-(size - bl - tl))}`,
    tl ? `a${esc(tl)} ${esc(tl)} 0 0 1 ${esc(tl)} ${esc(-tl)}` : `v${esc(-tl)}h${esc(tl)}`,
    'z',
  ].join('')
}

function classyPath(
  x: number,
  y: number,
  size: number,
  n: NeighborFlags,
  rounded: boolean,
): string {
  if (!n.top && !n.left) {
    return rounded
      ? continuousRoundedPath(x, y, size, n, 0.85)
      : `M${esc(x)} ${esc(y)}h${esc(size)}v${esc(size)}h${esc(-size)}z`
  }
  if (!n.bottom && !n.right) {
    return rounded
      ? continuousRoundedPath(x, y, size, n, 0.85)
      : `M${esc(x)} ${esc(y)}h${esc(size)}v${esc(size)}h${esc(-size)}z`
  }
  const inset = size * 0.15
  return roundedRectPath(x + inset, y + inset, size - inset * 2, size - inset * 2, rounded ? size * 0.2 : 0)
}

function squareFramePath(
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: number,
): string {
  const innerX = x + stroke
  const innerY = y + stroke
  const innerW = w - stroke * 2
  const innerH = h - stroke * 2
  return [
    `M${esc(x)} ${esc(y)}h${esc(w)}v${esc(h)}h${esc(-w)}z`,
    `M${esc(innerX)} ${esc(innerY)}v${esc(innerH)}h${esc(innerW)}v${esc(-innerH)}z`,
  ].join('')
}

function roundedFramePath(
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: number,
  radius: number,
): string {
  const outer = roundedRectPath(x, y, w, h, radius)
  const inner = roundedRectPath(
    x + stroke,
    y + stroke,
    w - stroke * 2,
    h - stroke * 2,
    Math.max(0, radius - stroke),
  )
  return `${outer}${inner}`
}

function ringPath(cx: number, cy: number, r: number, stroke: number): string {
  const outer = r + stroke / 2
  const inner = Math.max(0, r - stroke / 2)
  return `${circlePath(cx, cy, outer)}${circlePath(cx, cy, inner)}`
}
