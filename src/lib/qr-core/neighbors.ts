import type { QRMatrix } from './matrix.js'

export interface NeighborFlags {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
  topRight: boolean
  bottomRight: boolean
  bottomLeft: boolean
  topLeft: boolean
}

export function getNeighbors(matrix: QRMatrix, row: number, col: number): NeighborFlags {
  const size = matrix.length
  const dark = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size && matrix[r]![c]!

  return {
    top: dark(row - 1, col),
    right: dark(row, col + 1),
    bottom: dark(row + 1, col),
    left: dark(row, col - 1),
    topRight: dark(row - 1, col + 1),
    bottomRight: dark(row + 1, col + 1),
    bottomLeft: dark(row + 1, col - 1),
    topLeft: dark(row - 1, col - 1),
  }
}
