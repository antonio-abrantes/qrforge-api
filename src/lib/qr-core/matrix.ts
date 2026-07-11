import qrcode from 'qrcode-generator'
import {
  CapacityExceededError,
  type ErrorCorrectionLevel,
} from './types.js'

export type QRMatrix = boolean[][]

/** UTF-8 byte mode so CJK, emoji, accents encode correctly. */
function enableUtf8(): void {
  const fns = (qrcode as unknown as { stringToBytesFuncs?: Record<string, (s: string) => number[]> })
    .stringToBytesFuncs
  if (fns?.['UTF-8']) {
    ;(qrcode as unknown as { stringToBytes: (s: string) => number[] }).stringToBytes = fns['UTF-8']
  }
}

enableUtf8()

export function createMatrix(
  data: string,
  errorCorrectionLevel: ErrorCorrectionLevel = 'Q',
): QRMatrix {
  try {
    const qr = qrcode(0, errorCorrectionLevel)
    qr.addData(data)
    qr.make()
    const count = qr.getModuleCount()
    const matrix: QRMatrix = []
    for (let row = 0; row < count; row++) {
      const line: boolean[] = []
      for (let col = 0; col < count; col++) {
        line.push(qr.isDark(row, col))
      }
      matrix.push(line)
    }
    return matrix
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/code length overflow|overflow|too long|data/i.test(message)) {
      throw new CapacityExceededError(
        `Payload exceeds QR capacity at error correction level '${errorCorrectionLevel}'. Try a lower level (L) or shorten the data.`,
        errorCorrectionLevel,
      )
    }
    throw err
  }
}

/** Finder pattern top-left cells (7x7) including separators handled by isFinderRegion. */
export function isInFinderPattern(row: number, col: number, size: number): boolean {
  const inTopLeft = row < 7 && col < 7
  const inTopRight = row < 7 && col >= size - 7
  const inBottomLeft = row >= size - 7 && col < 7
  return inTopLeft || inTopRight || inBottomLeft
}

/** Outer 7x7 finder ring (corner square) vs inner 3x3 (corner dot). */
export function isFinderOuter(row: number, col: number, size: number): boolean {
  if (!isInFinderPattern(row, col, size)) return false
  const local = toLocalFinder(row, col, size)
  if (!local) return false
  const { r, c } = local
  const onOuterRing = r === 0 || r === 6 || c === 0 || c === 6
  return onOuterRing
}

export function isFinderInner(row: number, col: number, size: number): boolean {
  if (!isInFinderPattern(row, col, size)) return false
  const local = toLocalFinder(row, col, size)
  if (!local) return false
  const { r, c } = local
  return r >= 2 && r <= 4 && c >= 2 && c <= 4
}

function toLocalFinder(
  row: number,
  col: number,
  size: number,
): { r: number; c: number } | null {
  if (row < 7 && col < 7) return { r: row, c: col }
  if (row < 7 && col >= size - 7) return { r: row, c: col - (size - 7) }
  if (row >= size - 7 && col < 7) return { r: row - (size - 7), c: col }
  return null
}

export function getFinderOrigins(size: number): Array<{ row: number; col: number }> {
  return [
    { row: 0, col: 0 },
    { row: 0, col: size - 7 },
    { row: size - 7, col: 0 },
  ]
}
