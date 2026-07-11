import type {
  CornerDotShape,
  CornerSquareShape,
  DotShape,
  QRCodeConfig,
} from './types.js'

const DOT_SHAPES: DotShape[] = [
  'square',
  'rounded',
  'extra-rounded',
  'classy',
  'classy-rounded',
  'dots',
]
const CORNER_SQUARE_SHAPES: CornerSquareShape[] = [
  'square',
  'rounded',
  'extra-rounded',
  'dot',
]
const CORNER_DOT_SHAPES: CornerDotShape[] = ['square', 'rounded', 'dot']

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function randomHex(): string {
  const n = Math.floor(Math.random() * 0xffffff)
  return `#${n.toString(16).padStart(6, '0')}`
}

/** Random style config (no data / image) — mirrors mini-qr randomize. */
export function randomStyleConfig(): Omit<QRCodeConfig, 'data'> {
  const accent = randomHex()
  const ink = Math.random() > 0.5 ? '#111111' : randomHex()
  return {
    size: 360,
    margin: 2,
    errorCorrectionLevel: pick(['M', 'Q', 'H'] as const),
    dots: { shape: pick(DOT_SHAPES), color: ink },
    cornerSquares: { shape: pick(CORNER_SQUARE_SHAPES), color: accent },
    cornerDots: { shape: pick(CORNER_DOT_SHAPES), color: accent },
    background: { color: Math.random() > 0.3 ? '#ffffff' : randomHex() },
  }
}
