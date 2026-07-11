import {
  CapacityExceededError,
  encodeFromTemplate,
  generateQr,
  type DataTemplate,
  type GenerateResult,
  type QRCodeConfig,
  type TemplateDataMap,
} from '../lib/qr-core/index.js'
import type { CreateQrInput, FromTemplateInput } from '../schemas/qrcode.js'
import { AppError } from '../utils/errors.js'
import { fetchImageAsDataUri } from './image-fetch.js'

export async function createQrFromInput(input: CreateQrInput): Promise<GenerateResult> {
  const config: QRCodeConfig = {
    data: input.data,
    size: input.size,
    margin: input.margin,
    errorCorrectionLevel: input.errorCorrectionLevel,
    dots: input.dots,
    cornerSquares: input.cornerSquares,
    cornerDots: input.cornerDots,
    background: input.background,
    image: input.image,
    frame: input.frame,
  }

  let imageDataUri: string | undefined
  if (config.image?.href) {
    imageDataUri = await fetchImageAsDataUri(config.image.href)
  }
  if (config.frame?.backgroundImage) {
    config.frame = {
      ...config.frame,
      backgroundImage: await fetchImageAsDataUri(config.frame.backgroundImage),
    }
  }

  try {
    return await generateQr(config, {
      format: input.format,
      quality: input.quality,
      response: input.response,
      imageDataUri,
    })
  } catch (err) {
    if (err instanceof CapacityExceededError) {
      throw new AppError(err.message, 422, 'capacity_exceeded', {
        errorCorrectionLevel: err.errorCorrectionLevel,
      })
    }
    throw err
  }
}

export async function createQrFromTemplate(input: FromTemplateInput): Promise<GenerateResult> {
  const template = input.template as DataTemplate
  validateTemplateData(template, input.templateData)
  const data = encodeFromTemplate(
    template,
    input.templateData as TemplateDataMap[typeof template],
  )
  return createQrFromInput({
    data,
    ...input.style,
    format: input.format,
    quality: input.quality,
    response: input.response,
  })
}

function validateTemplateData(template: DataTemplate, data: Record<string, unknown>): void {
  switch (template) {
    case 'text':
      if (typeof data.text !== 'string' || !data.text) {
        throw new AppError('templateData.text is required', 400, 'validation_error', {
          field: 'templateData.text',
        })
      }
      break
    case 'url':
      if (typeof data.url !== 'string' || !data.url) {
        throw new AppError('templateData.url is required', 400, 'validation_error', {
          field: 'templateData.url',
        })
      }
      break
    case 'email':
      if (typeof data.address !== 'string' || !data.address) {
        throw new AppError('templateData.address is required', 400, 'validation_error', {
          field: 'templateData.address',
        })
      }
      break
    case 'phone':
      if (typeof data.phone !== 'string' || !data.phone) {
        throw new AppError('templateData.phone is required', 400, 'validation_error', {
          field: 'templateData.phone',
        })
      }
      break
    case 'sms':
      if (typeof data.phone !== 'string' || !data.phone) {
        throw new AppError('templateData.phone is required', 400, 'validation_error', {
          field: 'templateData.phone',
        })
      }
      break
    case 'wifi':
      if (typeof data.ssid !== 'string' || !data.ssid) {
        throw new AppError('templateData.ssid is required', 400, 'validation_error', {
          field: 'templateData.ssid',
        })
      }
      if (!['nopass', 'WEP', 'WPA'].includes(String(data.encryption))) {
        throw new AppError('templateData.encryption must be nopass|WEP|WPA', 400, 'validation_error', {
          field: 'templateData.encryption',
        })
      }
      break
    case 'vcard':
      if (!data.firstName && !data.lastName) {
        throw new AppError('vcard requires firstName or lastName', 400, 'validation_error', {
          field: 'templateData',
        })
      }
      break
    case 'location':
      if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        throw new AppError('latitude and longitude are required', 400, 'validation_error', {
          field: 'templateData',
        })
      }
      break
    case 'event':
      if (typeof data.title !== 'string' || !data.title || typeof data.startTime !== 'string') {
        throw new AppError('event requires title and startTime', 400, 'validation_error', {
          field: 'templateData',
        })
      }
      break
  }
}
