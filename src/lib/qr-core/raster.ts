import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import type { OutputFormat } from './types.js'

export interface RasterResult {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
}

export async function rasterizeSvg(
  svg: string,
  format: Extract<OutputFormat, 'png' | 'jpg'>,
  quality = 0.92,
): Promise<RasterResult> {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: true },
  })
  const rendered = resvg.render()
  const png = rendered.asPng()
  const width = rendered.width
  const height = rendered.height

  if (format === 'png') {
    return { buffer: Buffer.from(png), mimeType: 'image/png', width, height }
  }

  const jpg = await sharp(png)
    .jpeg({ quality: Math.round(Math.min(1, Math.max(0, quality)) * 100), mozjpeg: true })
    .toBuffer()

  return { buffer: jpg, mimeType: 'image/jpeg', width, height }
}
