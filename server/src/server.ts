import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'

export async function startServer(): Promise<void> {
  const app = createApp()
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  await connectDatabase(env.MONGODB_URI)
  const server = app.listen(env.PORT, () => {
    process.stdout.write(`ApartCheck listening on ${env.PORT}\n`)
  })

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDatabase()
    })
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startServer()
}
