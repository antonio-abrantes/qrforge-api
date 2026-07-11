import { env } from './config/env.js'
import { closeDb } from './db/client.js'
import { buildApp } from './app.js'
import { closeBatch, startBatchWorker } from './services/batch.service.js'

async function main() {
  const config = env()
  const app = await buildApp()

  try {
    const worker = startBatchWorker()
    worker.on('error', (err) => {
      app.log.warn({ err }, 'Batch worker error — Redis may be unavailable')
    })
  } catch (err) {
    app.log.warn({ err }, 'Batch worker failed to start — batch routes may be unavailable')
  }

  await app.listen({ port: config.PORT, host: config.HOST })
  app.log.info(`QRForge listening on http://${config.HOST}:${config.PORT}`)
  app.log.info(`Playground: http://localhost:${config.PORT}/playground`)
  app.log.info(`Docs: http://localhost:${config.PORT}/docs`)

  const shutdown = async (signal: string) => {
    app.log.info(`Shutting down (${signal})...`)
    await app.close()
    await closeBatch()
    await closeDb()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
