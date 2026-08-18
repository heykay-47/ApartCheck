import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { SocietyModel } from '../src/features/societies/society.model.js'
import { UnitModel } from '../src/features/units/unit.model.js'
import { UserModel } from '../src/features/users/user.model.js'
import { AssetModel } from '../src/features/assets/asset.model.js'
import { TicketModel } from '../src/features/tickets/ticket.model.js'
import { TicketEventModel } from '../src/features/tickets/ticket-event.model.js'
import { TicketEvidenceModel } from '../src/features/ticket-evidence/ticket-evidence.model.js'
import { FakeImageStorage } from './helpers/fake-image-storage.js'
process.env.NODE_ENV = 'test'
const port = Number(process.env.PORT ?? process.env.E2E_SERVER_PORT ?? 3000)
process.env.PORT = String(port)
process.env.JWT_SECRET = 'apartcheck-e2e-secret-at-least-32-bytes'
process.env.APP_BASE_URL = 'http://127.0.0.1:5173'
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud'
process.env.CLOUDINARY_API_KEY = 'test-api-key'
process.env.CLOUDINARY_API_SECRET = 'test-api-secret'
process.env.CLOUDINARY_AUTH_TOKEN_KEY = '0123456789abcdef0123456789abcdef'

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
  TicketModel.init(),
  TicketEventModel.init(),
  TicketEvidenceModel.init(),
])

const server = createApp({ imageStorage: new FakeImageStorage() }).listen(
  port,
  '127.0.0.1',
  () => {
    process.stdout.write(`ApartCheck e2e server listening on ${port}\n`)
  },
)

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
