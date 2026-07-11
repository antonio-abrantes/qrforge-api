import type { QRCodeConfig } from './types.js'

export interface StylePreset {
  id: string
  name: string
  config: Omit<QRCodeConfig, 'data'>
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'plain',
    name: 'Plain',
    config: {
      size: 300,
      margin: 2,
      dots: { shape: 'square', color: '#000000' },
      cornerSquares: { shape: 'square', color: '#000000' },
      cornerDots: { shape: 'square', color: '#000000' },
      background: { color: '#ffffff' },
    },
  },
  {
    id: 'rounded-blue',
    name: 'Rounded Blue',
    config: {
      size: 400,
      margin: 2,
      errorCorrectionLevel: 'Q',
      dots: { shape: 'rounded', color: '#0f172a' },
      cornerSquares: { shape: 'extra-rounded', color: '#2563eb' },
      cornerDots: { shape: 'dot', color: '#2563eb' },
      background: { color: '#ffffff' },
    },
  },
  {
    id: 'classy-dark',
    name: 'Classy Dark',
    config: {
      size: 400,
      margin: 1,
      dots: { shape: 'classy-rounded', color: '#f8fafc' },
      cornerSquares: { shape: 'rounded', color: '#38bdf8' },
      cornerDots: { shape: 'rounded', color: '#38bdf8' },
      background: { color: '#0b1220' },
    },
  },
  {
    id: 'dots-coral',
    name: 'Dots Coral',
    config: {
      size: 360,
      margin: 2,
      dots: { shape: 'dots', color: '#e11d48' },
      cornerSquares: { shape: 'dot', color: '#9f1239' },
      cornerDots: { shape: 'dot', color: '#9f1239' },
      background: { color: '#fff1f2' },
    },
  },
  {
    id: 'framed-scan',
    name: 'Framed Scan',
    config: {
      size: 320,
      margin: 2,
      dots: { shape: 'extra-rounded', color: '#111827' },
      cornerSquares: { shape: 'extra-rounded', color: '#059669' },
      cornerDots: { shape: 'rounded', color: '#059669' },
      background: { color: '#ffffff' },
      frame: {
        text: 'Scan me',
        textPosition: 'bottom',
        textColor: '#111827',
        backgroundColor: '#ecfdf5',
        borderColor: '#059669',
        borderWidth: 2,
        borderRadius: 16,
        padding: 16,
        fontSize: 22,
        fontFamily: 'sans-serif',
      },
    },
  },
]

export function listPresets(): StylePreset[] {
  return STYLE_PRESETS
}

export function getPreset(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((p) => p.id === id)
}
