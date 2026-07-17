import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { Types } from 'mongoose'
import {
  AssetModel,
  type Asset,
} from '../../src/features/assets/asset.model.js'
import {
  SocietyModel,
  type Society,
} from '../../src/features/societies/society.model.js'
import { UnitModel, type Unit } from '../../src/features/units/unit.model.js'
import {
  UserModel,
  type User,
  type UserRole,
} from '../../src/features/users/user.model.js'

const testPassword = 'apartcheck-test-password'

export async function createSocietyFixture(
  overrides: Partial<Pick<Society, 'name' | 'address' | 'singletonKey'>> = {},
) {
  return SocietyModel.create({
    name: 'Fixture Society',
    address: 'Chennai',
    singletonKey: `fixture-${randomUUID()}`,
    ...overrides,
  })
}

export async function createUnitFixture(
  overrides: Partial<
    Pick<Unit, 'societyId' | 'building' | 'floor' | 'unitNumber' | 'archivedAt'>
  > = {},
) {
  const societyId = overrides.societyId ?? (await createSocietyFixture())._id
  return UnitModel.create({
    societyId,
    building: 'Tower A',
    floor: 'G',
    unitNumber: `A-${randomUUID().slice(0, 6)}`,
    ...overrides,
  })
}

export async function createUserFixture(
  overrides: Partial<
    Pick<
      User,
      | 'name'
      | 'email'
      | 'phone'
      | 'role'
      | 'societyId'
      | 'unitId'
      | 'mustChangePassword'
      | 'tokenVersion'
      | 'active'
    >
  > & { passwordHash?: string } = {},
) {
  const societyId = overrides.societyId ?? (await createSocietyFixture())._id
  const role: UserRole = overrides.role ?? 'technician'
  const unitId =
    role === 'resident'
      ? (overrides.unitId ?? (await createUnitFixture({ societyId }))._id)
      : null
  const passwordHash =
    overrides.passwordHash ?? (await bcrypt.hash(testPassword, 12))

  return UserModel.create({
    name: 'Fixture User',
    email: `user-${randomUUID()}@example.com`,
    phone: '+919876543210',
    role,
    societyId,
    unitId,
    passwordHash,
    ...overrides,
  })
}

export async function createAssetFixture(
  overrides: Partial<
    Pick<
      Asset,
      | 'societyId'
      | 'assetCode'
      | 'name'
      | 'category'
      | 'locationDescription'
      | 'installDate'
      | 'qrToken'
      | 'archivedAt'
    >
  > = {},
) {
  const societyId = overrides.societyId ?? (await createSocietyFixture())._id
  return AssetModel.create({
    societyId,
    assetCode: `LFT-${randomUUID().slice(0, 6).toUpperCase()}`,
    name: 'Fixture Lift',
    category: 'lift',
    locationDescription: 'Tower A lobby',
    installDate: null,
    qrToken: Buffer.from(new Types.ObjectId().toString()).toString('base64url'),
    archivedAt: null,
    ...overrides,
  })
}
