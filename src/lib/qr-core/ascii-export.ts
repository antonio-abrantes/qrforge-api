import type { QRMatrix } from './matrix.js'

const UNICODE_BLOCKS = {
  full: '█',
  empty: '░',
  dark: '██',
  light: '  ',
} as const

export function qrMatrixToAscii(matrix: QRMatrix, margin = 1): string {
  const lines: string[] = []
  const size = matrix.length
  const empty = '  '
  const dark = '##'

  for (let i = 0; i < margin; i++) {
    lines.push(empty.repeat(size + margin * 2))
  }
  for (let row = 0; row < size; row++) {
    let line = empty.repeat(margin)
    for (let col = 0; col < size; col++) {
      line += matrix[row]![col] ? dark : empty
    }
    line += empty.repeat(margin)
    lines.push(line)
  }
  for (let i = 0; i < margin; i++) {
    lines.push(empty.repeat(size + margin * 2))
  }
  return lines.join('\n')
}

export function qrMatrixToUnicode(matrix: QRMatrix, margin = 1): string {
  const lines: string[] = []
  const size = matrix.length

  for (let i = 0; i < margin; i++) {
    lines.push(UNICODE_BLOCKS.empty.repeat(size + margin * 2))
  }
  for (let row = 0; row < size; row++) {
    let line = UNICODE_BLOCKS.empty.repeat(margin)
    for (let col = 0; col < size; col++) {
      line += matrix[row]![col] ? UNICODE_BLOCKS.full : UNICODE_BLOCKS.empty
    }
    line += UNICODE_BLOCKS.empty.repeat(margin)
    lines.push(line)
  }
  for (let i = 0; i < margin; i++) {
    lines.push(UNICODE_BLOCKS.empty.repeat(size + margin * 2))
  }
  return lines.join('\n')
}
