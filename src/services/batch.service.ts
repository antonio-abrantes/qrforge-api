import { createHash } from 'node:crypto'
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq'
import JSZip from 'jszip'
import { env } from '../config/env.js'
import { generateQr, type GenerateResult, type QRCodeConfig } from '../lib/qr-core/index.js'
import type { BatchInput } from '../schemas/qrcode.js'
import { AppError } from '../utils/errors.js'
import { fetchImageAsDataUri } from './image-fetch.js'

export type BatchStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface BatchJobData {
  style?: BatchInput['style']
  format: BatchInput['format']
  quality: number
  response: BatchInput['response']
  items: BatchInput['items']
  imageDataUri?: string
}

export interface BatchJobResult {
  response: BatchInput['response']
  format: BatchInput['format']
  zipBase64?: string
  items?: Array<{
    id: string
    format: string
    encoding: 'base64' | 'dataurl'
    mimeType: string
    data: string
    bytes: number
  }>
}

let queue: Queue<BatchJobData, BatchJobResult> | null = null
let worker: Worker<BatchJobData, BatchJobResult> | null = null

function getConnection(): ConnectionOptions {
  return { url: env().REDIS_URL, maxRetriesPerRequest: null }
}

export function getBatchQueue(): Queue<BatchJobData, BatchJobResult> {
  if (!queue) {
    queue = new Queue<BatchJobData, BatchJobResult>('qr-batch', {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 200 },
      },
    })
  }
  return queue
}

export function startBatchWorker(): Worker<BatchJobData, BatchJobResult> {
  if (worker) return worker
  worker = new Worker<BatchJobData, BatchJobResult>(
    'qr-batch',
    async (job) => processBatchJob(job),
    { connection: getConnection(), concurrency: 2 },
  )
  worker.on('failed', (job, err) => {
    console.error(`[batch] job ${job?.id} failed:`, err.message)
  })
  return worker
}

async function processBatchJob(job: Job<BatchJobData, BatchJobResult>): Promise<BatchJobResult> {
  const { items, style, format, quality, response, imageDataUri } = job.data
  const results: GenerateResult[] = []
  const ids: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    ids.push(item.id)
    const config: QRCodeConfig = {
      data: item.data,
      ...style,
    }
    const generated = await generateQr(config, {
      format,
      quality,
      response: format === 'ascii' || format === 'unicode' ? 'binary' : response,
      imageDataUri,
    })
    results.push(generated)
    await job.updateProgress(Math.round(((i + 1) / items.length) * 100))
  }

  if (response === 'base64' || response === 'dataurl') {
    if (items.length > env().BATCH_BASE64_MAX_ITEMS) {
      throw new Error(
        `Base64 batch limited to ${env().BATCH_BASE64_MAX_ITEMS} items; use response=binary`,
      )
    }
    return {
      response,
      format,
      items: results.map((r, idx) => {
        if (r.kind === 'json') {
          return {
            id: ids[idx]!,
            format: r.format,
            encoding: r.encoding,
            mimeType: r.mimeType,
            data: r.data,
            bytes: r.bytes,
          }
        }
        const b64 = r.buffer.toString('base64')
        return {
          id: ids[idx]!,
          format: r.format,
          encoding: response,
          mimeType: r.mimeType,
          data: response === 'dataurl' ? `data:${r.mimeType};base64,${b64}` : b64,
          bytes: r.bytes,
        }
      }),
    }
  }

  const zip = new JSZip()
  const ext =
    format === 'jpg' ? 'jpg' : format === 'svg' ? 'svg' : format === 'png' ? 'png' : 'txt'
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!
    const buffer = r.kind === 'binary' ? r.buffer : Buffer.from(r.data, 'base64')
    zip.file(`${sanitizeFilename(ids[i]!)}.${ext}`, buffer)
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return {
    response: 'binary',
    format,
    zipBase64: zipBuffer.toString('base64'),
  }
}

function sanitizeFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 128)
}

export async function enqueueBatch(input: BatchInput): Promise<{ jobId: string }> {
  if (input.items.length > env().BATCH_MAX_ITEMS) {
    throw new AppError(
      `Batch limited to ${env().BATCH_MAX_ITEMS} items`,
      400,
      'batch_too_large',
    )
  }
  if (
    (input.response === 'base64' || input.response === 'dataurl') &&
    input.items.length > env().BATCH_BASE64_MAX_ITEMS
  ) {
    throw new AppError(
      `Base64/dataurl batch limited to ${env().BATCH_BASE64_MAX_ITEMS} items; use response=binary`,
      400,
      'batch_too_large',
    )
  }

  let imageDataUri: string | undefined
  let style = input.style
  if (style?.image?.href) {
    imageDataUri = await fetchImageAsDataUri(style.image.href)
  }
  if (style?.frame?.backgroundImage) {
    style = {
      ...style,
      frame: {
        ...style.frame,
        backgroundImage: await fetchImageAsDataUri(style.frame.backgroundImage),
      },
    }
  }

  const job = await getBatchQueue().add('generate', {
    style,
    format: input.format,
    quality: input.quality,
    response: input.response,
    items: input.items,
    imageDataUri,
  })

  return { jobId: String(job.id) }
}

export async function getBatchStatus(jobId: string) {
  const job = await getBatchQueue().getJob(jobId)
  if (!job) throw new AppError('Batch job not found', 404, 'job_not_found')

  const state = await job.getState()
  let status: BatchStatus = 'queued'
  if (state === 'active') status = 'processing'
  else if (state === 'completed') status = 'completed'
  else if (state === 'failed') status = 'failed'
  else if (
    state === 'waiting' ||
    state === 'delayed' ||
    state === 'prioritized' ||
    state === 'waiting-children'
  ) {
    status = 'queued'
  }

  const body: Record<string, unknown> = {
    jobId,
    status,
    progress: job.progress,
  }
  if (status === 'completed') {
    body.downloadUrl = `/v1/qrcodes/batch/${jobId}/download`
  }
  if (status === 'failed') {
    body.error = job.failedReason ?? 'unknown'
  }
  return body
}

export async function getBatchDownload(jobId: string): Promise<{
  contentType: string
  body: Buffer | Record<string, unknown>
  filename?: string
}> {
  const job = await getBatchQueue().getJob(jobId)
  if (!job) throw new AppError('Batch job not found', 404, 'job_not_found')
  const state = await job.getState()
  if (state !== 'completed') {
    throw new AppError('Batch job is not completed yet', 409, 'job_not_ready', { state })
  }
  const result = job.returnvalue
  if (!result) throw new AppError('Batch result missing', 500, 'job_result_missing')

  if (result.response === 'base64' || result.response === 'dataurl') {
    return {
      contentType: 'application/json; charset=utf-8',
      body: { jobId, items: result.items ?? [] },
    }
  }

  if (!result.zipBase64) {
    throw new AppError('Zip result missing', 500, 'job_result_missing')
  }
  return {
    contentType: 'application/zip',
    body: Buffer.from(result.zipBase64, 'base64'),
    filename: `qr-batch-${jobId}.zip`,
  }
}

export function cacheKeyForConfig(payload: unknown): string {
  const json = JSON.stringify(payload)
  return createHash('sha256').update(json).digest('hex')
}

export async function closeBatch(): Promise<void> {
  await worker?.close()
  await queue?.close()
  worker = null
  queue = null
}
