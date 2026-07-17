import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { AssetModel } from '../src/features/assets/asset.model.js'
import { SocietyModel } from '../src/features/societies/society.model.js'
import { UnitModel } from '../src/features/units/unit.model.js'
import { UserModel } from '../src/features/users/user.model.js'

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(replicaSet.getUri())
  await Promise.all([
    SocietyModel.init(),
    UnitModel.init(),
    UserModel.init(),
    AssetModel.init(),
  ])
})

beforeEach(async ({ task }) => {
  if (task.file.name.endsWith('error-contract.test.ts')) {
    await mongoose.disconnect()
  }
})

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return

  await Promise.all([
    SocietyModel.deleteMany({}),
    UnitModel.deleteMany({}),
    UserModel.deleteMany({}),
    AssetModel.deleteMany({}),
  ])
})

afterAll(async () => {
  await mongoose.disconnect()
  await replicaSet.stop()
})
