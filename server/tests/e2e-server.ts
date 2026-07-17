import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { SocietyModel } from '../src/features/societies/society.model.js'
import { UnitModel } from '../src/features/units/unit.model.js'
import { UserModel } from '../src/features/users/user.model.js'
import { AssetModel } from '../src/features/assets/asset.model.js'

process.env.NODE_ENV = 'test'
process.env.PORT = '3000'
process.env.JWT_SECRET = 'apartcheck-e2e-secret-at-least-32-bytes'
process.env.APP_BASE_URL = 'http://127.0.0.1:5173'

const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
process.env.MONGODB_URI = replicaSet.getUri()

const [{ createApp }, { connectDatabase, disconnectDatabase }] =
  await Promise.all([
    import('../src/app.js'),
    import('../src/config/database.js'),
  ])

await connectDatabase(process.env.MONGODB_URI)
await Promise.all([
  SocietyModel.init(),
  UnitModel.init(),
  UserModel.init(),
  AssetModel.init(),
])

const server = createApp().listen(3000, '127.0.0.1', () => {
  process.stdout.write('ApartCheck e2e server listening on 3000\n')
})

let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  await disconnectDatabase()
  await replicaSet.stop()
}

process.once('SIGTERM', () => void stop())
process.once('SIGINT', () => void stop())
