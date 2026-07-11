import { qrMatrixToAscii, qrMatrixToUnicode } from './ascii-export.js'
import { rasterizeSvg } from './raster.js'
import { renderToSvg } from './svg-render.js'
import type { OutputFormat, QRCodeConfig, ResponseEncoding } from './types.js'

export interface GenerateOptions {
  format?: OutputFormat
  quality?: number
  response?: ResponseEncoding
  imageDataUri?: string
}

export interface GenerateBinaryResult {
  kind: 'binary'
  format: OutputFormat
  mimeType: string
  buffer: Buffer
  width: number
  height: number
  bytes: number
}

export interface GenerateJsonResult {
  kind: 'json'
  format: OutputFormat
  encoding: 'base64' | 'dataurl'
  mimeType: string
  data: string
  size: { width: number; height: number }
  bytes: number
}

export type GenerateResult = GenerateBinaryResult | GenerateJsonResult

const MIME: Record<OutputFormat, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  ascii: 'text/plain; charset=utf-8',
  unicode: 'text/plain; charset=utf-8',
}

export async function generateQr(
  config: QRCodeConfig,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const format = options.format ?? 'png'
  const response = options.response ?? 'binary'
  const rendered = renderToSvg(config, { imageDataUri: options.imageDataUri })

  if (format === 'ascii' || format === 'unicode') {
    const text =
      format === 'ascii'
        ? qrMatrixToAscii(rendered.matrix, config.margin ?? 0)
        : qrMatrixToUnicode(rendered.matrix, config.margin ?? 0)
    const buffer = Buffer.from(text, 'utf8')
    return {
      kind: 'binary',
      format,
      mimeType: MIME[format],
      buffer,
      width: rendered.width,
      height: rendered.height,
      bytes: buffer.byteLength,
    }
  }

  let buffer: Buffer
  let mimeType: string
  let width = rendered.width
  let height = rendered.height

  if (format === 'svg') {
    buffer = Buffer.from(rendered.svg, 'utf8')
    mimeType = MIME.svg
  } else {
    const raster = await rasterizeSvg(rendered.svg, format, options.quality ?? 0.92)
    buffer = raster.buffer
    mimeType = raster.mimeType
    width = raster.width
    height = raster.height
  }

  if (response === 'base64' || response === 'dataurl') {
    const b64 = buffer.toString('base64')
    return {
      kind: 'json',
      format,
      encoding: response,
      mimeType,
      data: response === 'dataurl' ? `data:${mimeType};base64,${b64}` : b64,
      size: { width, height },
      bytes: buffer.byteLength,
    }
  }

  return {
    kind: 'binary',
    format,
    mimeType,
    buffer,
    width,
    height,
    bytes: buffer.byteLength,
  }
}
