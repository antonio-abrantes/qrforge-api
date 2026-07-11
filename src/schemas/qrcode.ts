import { z } from 'zod'

export const DotShapeSchema = z.enum([
  'square',
  'rounded',
  'extra-rounded',
  'classy',
  'classy-rounded',
  'dots',
])
export const CornerSquareShapeSchema = z.enum(['square', 'rounded', 'extra-rounded', 'dot'])
export const CornerDotShapeSchema = z.enum(['square', 'rounded', 'dot'])
export const ECLevelSchema = z.enum(['L', 'M', 'Q', 'H'])
export const FormatSchema = z.enum(['svg', 'png', 'jpg', 'ascii', 'unicode'])
export const ResponseSchema = z.enum(['binary', 'base64', 'dataurl'])

export const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  .or(z.literal('transparent'))

export const ImageSchema = z.object({
  href: z.string().min(1),
  sizeRatio: z.number().min(0.05).max(0.5).optional(),
  margin: z.number().min(0).optional(),
  hideBackgroundDots: z.boolean().optional(),
  crossOrigin: z.enum(['anonymous', 'use-credentials']).optional(),
})

export const FrameSchema = z.object({
  text: z.string().min(1),
  textPosition: z.enum(['top', 'bottom', 'left', 'right']),
  textColor: HexColorSchema.optional(),
  backgroundColor: HexColorSchema.optional(),
  borderColor: HexColorSchema.optional(),
  borderWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  padding: z.number().min(0).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(1).optional(),
  captionWidth: z.number().min(1).optional(),
  backgroundImage: z.string().optional(),
})

export const StyleConfigSchema = z.object({
  size: z.number().int().min(64).max(4096).optional(),
  margin: z.number().int().min(0).max(100).optional(),
  errorCorrectionLevel: ECLevelSchema.optional(),
  dots: z
    .object({ shape: DotShapeSchema.optional(), color: HexColorSchema.optional() })
    .optional(),
  cornerSquares: z
    .object({
      shape: CornerSquareShapeSchema.optional(),
      color: HexColorSchema.optional(),
    })
    .optional(),
  cornerDots: z
    .object({ shape: CornerDotShapeSchema.optional(), color: HexColorSchema.optional() })
    .optional(),
  background: z.object({ color: HexColorSchema.optional() }).optional(),
  image: ImageSchema.optional(),
  frame: FrameSchema.optional(),
})

export const CreateQrSchema = StyleConfigSchema.extend({
  data: z.string().min(1).max(4296),
  format: FormatSchema.default('png'),
  quality: z.number().min(0).max(1).default(0.92),
  response: ResponseSchema.default('binary'),
})

export const TemplateKindSchema = z.enum([
  'text',
  'url',
  'email',
  'phone',
  'sms',
  'wifi',
  'vcard',
  'location',
  'event',
])

export const TemplateDataSchema = z.union([
  z.object({ text: z.string().min(1) }),
  z.object({ url: z.string().min(1) }),
  z.object({
    address: z.string().email(),
    subject: z.string().optional(),
    body: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
  }),
  z.object({ phone: z.string().min(1) }),
  z.object({ phone: z.string().min(1), message: z.string().optional() }),
  z.object({
    ssid: z.string().min(1),
    encryption: z.enum(['nopass', 'WEP', 'WPA']),
    password: z.string().optional(),
    hidden: z.boolean().optional(),
  }),
  z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      organization: z.string().optional(),
      title: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      url: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
      version: z.enum(['2.1', '3.0', '4.0']).optional(),
    })
    .refine((v) => Boolean(v.firstName || v.lastName), {
      message: 'vcard requires firstName or lastName',
    }),
  z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  z.object({
    title: z.string().min(1),
    location: z.string().optional(),
    startTime: z.string().min(1),
    endTime: z.string().optional(),
  }),
])

export const FromTemplateSchema = z.object({
  template: TemplateKindSchema,
  templateData: z.record(z.unknown()),
  style: StyleConfigSchema.optional(),
  format: FormatSchema.default('png'),
  quality: z.number().min(0).max(1).default(0.92),
  response: ResponseSchema.default('binary'),
})

export const DetectSchema = z.object({
  data: z.string().min(1),
})

export const BatchItemSchema = z.object({
  id: z.string().min(1).max(128),
  data: z.string().min(1).max(4296),
})

export const BatchSchema = z.object({
  style: StyleConfigSchema.optional(),
  format: FormatSchema.default('png'),
  quality: z.number().min(0).max(1).default(0.92),
  response: ResponseSchema.default('binary'),
  items: z.array(BatchItemSchema).min(1).max(500),
})

export type CreateQrInput = z.infer<typeof CreateQrSchema>
export type FromTemplateInput = z.infer<typeof FromTemplateSchema>
export type BatchInput = z.infer<typeof BatchSchema>
