/** Shared QR configuration types (API contract). */

export type DotShape =
  | 'square'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded'
  | 'dots'

export type CornerSquareShape = 'square' | 'rounded' | 'extra-rounded' | 'dot'
export type CornerDotShape = 'square' | 'rounded' | 'dot'
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
export type OutputFormat = 'svg' | 'png' | 'jpg' | 'ascii' | 'unicode'
export type ResponseEncoding = 'binary' | 'base64' | 'dataurl'
export type FrameTextPosition = 'top' | 'bottom' | 'left' | 'right'

export interface QRCodeConfig {
  data: string
  size?: number
  margin?: number
  errorCorrectionLevel?: ErrorCorrectionLevel
  dots?: { shape?: DotShape; color?: string }
  cornerSquares?: { shape?: CornerSquareShape; color?: string }
  cornerDots?: { shape?: CornerDotShape; color?: string }
  background?: { color?: string }
  image?: {
    href: string
    sizeRatio?: number
    margin?: number
    hideBackgroundDots?: boolean
    crossOrigin?: 'anonymous' | 'use-credentials'
  }
  frame?: {
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
}

export interface ResolvedQRCodeConfig {
  data: string
  size: number
  margin: number
  errorCorrectionLevel: ErrorCorrectionLevel
  dots: { shape: DotShape; color: string }
  cornerSquares: { shape: CornerSquareShape; color: string }
  cornerDots: { shape: CornerDotShape; color: string }
  background: { color: string }
  image?: QRCodeConfig['image']
  frame?: QRCodeConfig['frame']
}

export const DEFAULT_CONFIG: Omit<ResolvedQRCodeConfig, 'data'> = {
  size: 200,
  margin: 0,
  errorCorrectionLevel: 'Q',
  dots: { shape: 'square', color: '#000000' },
  cornerSquares: { shape: 'square', color: '#000000' },
  cornerDots: { shape: 'square', color: '#000000' },
  background: { color: '#ffffff' },
}

export function resolveConfig(config: QRCodeConfig): ResolvedQRCodeConfig {
  return {
    data: config.data,
    size: config.size ?? DEFAULT_CONFIG.size,
    margin: config.margin ?? DEFAULT_CONFIG.margin,
    errorCorrectionLevel: config.errorCorrectionLevel ?? DEFAULT_CONFIG.errorCorrectionLevel,
    dots: {
      shape: config.dots?.shape ?? DEFAULT_CONFIG.dots.shape,
      color: config.dots?.color ?? DEFAULT_CONFIG.dots.color,
    },
    cornerSquares: {
      shape: config.cornerSquares?.shape ?? DEFAULT_CONFIG.cornerSquares.shape,
      color: config.cornerSquares?.color ?? DEFAULT_CONFIG.cornerSquares.color,
    },
    cornerDots: {
      shape: config.cornerDots?.shape ?? DEFAULT_CONFIG.cornerDots.shape,
      color: config.cornerDots?.color ?? DEFAULT_CONFIG.cornerDots.color,
    },
    background: {
      color: config.background?.color ?? DEFAULT_CONFIG.background.color,
    },
    image: config.image,
    frame: config.frame,
  }
}

export class CapacityExceededError extends Error {
  readonly code = 'capacity_exceeded' as const
  constructor(
    message: string,
    readonly errorCorrectionLevel: ErrorCorrectionLevel,
  ) {
    super(message)
    this.name = 'CapacityExceededError'
  }
}
