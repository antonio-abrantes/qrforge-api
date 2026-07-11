import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CapacityExceededError, detectDataType, randomStyleConfig } from '../lib/qr-core/index.js'
import {
  BatchSchema,
  CreateQrSchema,
  DetectSchema,
  FromTemplateSchema,
} from '../schemas/qrcode.js'
import {
  enqueueBatch,
  getBatchDownload,
  getBatchStatus,
} from '../services/batch.service.js'
import { createQrFromInput, createQrFromTemplate } from '../services/qr.service.js'
import { isAppError } from '../utils/errors.js'

const JobIdParams = z.object({
  jobId: z.string().min(1).describe('Batch job id returned by POST /qrcodes/batch'),
})

function sendGenerateResult(
  reply: {
    header: (k: string, v: string) => unknown
    type: (t: string) => { send: (b: unknown) => unknown }
    send: (b: unknown) => unknown
  },
  result: Awaited<ReturnType<typeof createQrFromInput>>,
) {
  if (result.kind === 'json') {
    return reply.type('application/json; charset=utf-8').send({
      format: result.format,
      encoding: result.encoding,
      mimeType: result.mimeType,
      data: result.data,
      size: result.size,
      bytes: result.bytes,
    })
  }
  reply.header('Content-Length', String(result.bytes))
  return reply.type(result.mimeType).send(result.buffer)
}

function handleQrError(reply: { code: (n: number) => { send: (b: unknown) => unknown } }, err: unknown) {
  if (isAppError(err)) {
    return reply.code(err.statusCode).send({
      error: err.code,
      message: err.message,
      ...err.details,
    })
  }
  if (err instanceof CapacityExceededError) {
    return reply.code(422).send({
      error: 'capacity_exceeded',
      message: err.message,
      errorCorrectionLevel: err.errorCorrectionLevel,
    })
  }
  console.error(err)
  return reply.code(500).send({ error: 'internal_error', message: 'Unexpected error' })
}

export const qrcodeRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post(
    '/qrcodes',
    {
      schema: {
        tags: ['QR Codes'],
        summary: 'Generate a QR code',
        description:
          'Builds a QR from `data` plus optional style. `response=binary` → image/text bytes; `base64`/`dataurl` → JSON envelope (`format`, `encoding`, `mimeType`, `data`, `size`, `bytes`).',
        body: CreateQrSchema,
      },
    },
    async (req, reply) => {
      try {
        const result = await createQrFromInput(req.body)
        return sendGenerateResult(reply, result)
      } catch (err) {
        return handleQrError(reply, err)
      }
    },
  )

  app.post(
    '/qrcodes/from-template',
    {
      schema: {
        tags: ['QR Codes'],
        summary: 'Generate from a data template',
        description:
          'Encodes structured fields (wifi, vcard, email, …) into the correct payload, then generates the QR with optional style.',
        body: FromTemplateSchema,
      },
    },
    async (req, reply) => {
      try {
        const result = await createQrFromTemplate(req.body)
        return sendGenerateResult(reply, result)
      } catch (err) {
        return handleQrError(reply, err)
      }
    },
  )

  app.post(
    '/qrcodes/detect',
    {
      schema: {
        tags: ['QR Codes'],
        summary: 'Detect payload type',
        description: 'Reverse-engineers a raw QR payload into `{ type, parsedData }`.',
        body: DetectSchema,
      },
    },
    async (req) => detectDataType(req.body.data),
  )

  app.post(
    '/qrcodes/random',
    {
      schema: {
        tags: ['QR Codes'],
        summary: 'Random style config',
        description: 'Returns a random style config (no image). Use it as a base for POST /qrcodes.',
      },
    },
    async (_req, reply) => reply.send({ config: randomStyleConfig() }),
  )

  app.post(
    '/qrcodes/batch',
    {
      schema: {
        tags: ['Batch'],
        summary: 'Enqueue a batch job',
        description:
          'Queues N QR generations with a shared style. Poll status, then download ZIP (binary) or JSON (base64/dataurl).',
        body: BatchSchema,
      },
    },
    async (req, reply) => {
      try {
        const { jobId } = await enqueueBatch(req.body)
        return reply.code(202).send({
          jobId,
          status: 'queued',
          statusUrl: `/v1/qrcodes/batch/${jobId}/status`,
        })
      } catch (err) {
        return handleQrError(reply, err)
      }
    },
  )

  app.get(
    '/qrcodes/batch/:jobId/status',
    {
      schema: {
        tags: ['Batch'],
        summary: 'Batch job status',
        params: JobIdParams,
      },
    },
    async (req, reply) => {
      try {
        return await getBatchStatus(req.params.jobId)
      } catch (err) {
        return handleQrError(reply, err)
      }
    },
  )

  app.get(
    '/qrcodes/batch/:jobId/download',
    {
      schema: {
        tags: ['Batch'],
        summary: 'Download batch result',
        description:
          'ZIP when the job used `response=binary`; JSON item list when `base64`/`dataurl`.',
        params: JobIdParams,
      },
    },
    async (req, reply) => {
      try {
        const file = await getBatchDownload(req.params.jobId)
        if (Buffer.isBuffer(file.body)) {
          if (file.filename) {
            reply.header('Content-Disposition', `attachment; filename="${file.filename}"`)
          }
          return reply.type(file.contentType).send(file.body)
        }
        return reply.type(file.contentType).send(file.body)
      } catch (err) {
        return handleQrError(reply, err)
      }
    },
  )
}
