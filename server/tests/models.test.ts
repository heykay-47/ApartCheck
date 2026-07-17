import { describe, expect, it } from 'vitest'
import {
  AssetModel,
  type AssetCategory,
} from '../src/features/assets/asset.model.js'
import { SocietyModel } from '../src/features/societies/society.model.js'
import { UnitModel } from '../src/features/units/unit.model.js'
import { UserModel } from '../src/features/users/user.model.js'
import {
  createAssetFixture,
  createSocietyFixture,
  createUnitFixture,
  createUserFixture,
} from './helpers/factories.js'

describe('persistence models', () => {
  it('rejects a second primary society', async () => {
    await SocietyModel.create({
      name: 'Lake View',
      address: 'Chennai',
      singletonKey: 'primary',
    })

    await expect(
      SocietyModel.create({
        name: 'Park View',
        address: 'Chennai',
        singletonKey: 'primary',
      }),
    ).rejects.toMatchObject({ code: 11000 })
  })

  it('compares unit identity case-insensitively', async () => {
    const society = await createSocietyFixture()
    await UnitModel.create({
      societyId: society.id,
      building: 'Tower A',
      floor: 'G',
      unitNumber: 'A1',
    })

    await expect(
      UnitModel.create({
        societyId: society.id,
        building: 'tower a',
        floor: 'g',
        unitNumber: 'a1',
      }),
    ).rejects.toMatchObject({ code: 11000 })
  })

  it('enforces global normalized email uniqueness', async () => {
    await createUserFixture({ email: 'resident@example.com' })

    await expect(
      createUserFixture({ email: ' RESIDENT@EXAMPLE.COM ' }),
    ).rejects.toMatchObject({
      code: 11000,
    })
  })

  it('requires unitId for residents', async () => {
    await expect(
      createUserFixture({ role: 'resident', unitId: null }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
    })
  })

  it('rejects unitId for non-residents', async () => {
    const unit = await createUnitFixture()

    await expect(
      createUserFixture({ role: 'admin', unitId: unit._id }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
    })
  })

  it('validates asset category and unique QR tokens', async () => {
    await expect(
      createAssetFixture({ category: 'invalid' as AssetCategory }),
    ).rejects.toMatchObject({ name: 'ValidationError' })

    const first = await createAssetFixture({ qrToken: 'same-token' })
    await expect(
      createAssetFixture({ qrToken: first.qrToken }),
    ).rejects.toMatchObject({ code: 11000 })
  })

  it('applies defaults and safe JSON serialization', async () => {
    const user = await createUserFixture()
    const asset = await createAssetFixture()
    const persistedAsset = await AssetModel.findById(asset._id)

    expect(user.tokenVersion).toBe(0)
    expect(user.active).toBe(true)
    expect(asset.archivedAt).toBeNull()
    expect(persistedAsset).not.toBeNull()

    const serialized = JSON.parse(
      JSON.stringify({ user, asset: persistedAsset }),
    ) as {
      user: Record<string, unknown>
      asset: Record<string, unknown>
    }
    expect(serialized.user.id).toBe(user.id)
    expect(serialized.user).not.toHaveProperty('_id')
    expect(serialized.user).not.toHaveProperty('__v')
    expect(serialized.user).not.toHaveProperty('passwordHash')
    expect(serialized.asset.id).toBe(asset.id)
    expect(serialized.asset).not.toHaveProperty('qrToken')
  })

  it('preserves qrToken when explicitly selected for QR generation', async () => {
    const asset = await createAssetFixture({ qrToken: 'qr-token-for-service' })

    const selected = await AssetModel.findById(asset._id).select('+qrToken')
    expect(selected).not.toBeNull()

    const serialized = JSON.parse(JSON.stringify(selected)) as Record<
      string,
      unknown
    >
    expect(serialized.qrToken).toBe('qr-token-for-service')
  })

  it('allows fixture societies without changing the product singleton key', async () => {
    const first = await createSocietyFixture()
    const second = await createSocietyFixture()

    expect(first.singletonKey).not.toBe('primary')
    expect(second.singletonKey).not.toBe(first.singletonKey)
  })

  it('exports initialized models with required indexes', async () => {
    expect(SocietyModel.schema.indexes()).toContainEqual([
      { singletonKey: 1 },
      { unique: true },
    ])
    expect(UnitModel.schema.indexes()).toContainEqual([
      { societyId: 1, buildingKey: 1, floorKey: 1, unitNumberKey: 1 },
      { unique: true },
    ])
    expect(UserModel.schema.indexes()).toContainEqual([
      { email: 1 },
      { unique: true },
    ])
    expect(AssetModel.schema.indexes()).toContainEqual([
      { qrToken: 1 },
      { unique: true },
    ])
  })
})
