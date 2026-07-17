import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { SocietyModel } from './features/societies/society.model.js'
import { UnitModel } from './features/units/unit.model.js'
import { UserModel } from './features/users/user.model.js'
import { AssetModel } from './features/assets/asset.model.js'

export async function startServer(): Promise<void> {
  const app = createApp()
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  await connectDatabase(env.MONGODB_URI)
  await Promise.all([
    SocietyModel.init(),
    UnitModel.init(),
    UserModel.init(),
    AssetModel.init(),
  ])
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
