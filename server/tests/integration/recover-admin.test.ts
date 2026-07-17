import { describe, expect, it } from 'vitest'
import { verifyPassword } from '../../src/features/auth/password.js'
import { recoverAdmin } from '../../src/features/users/recover-admin.js'
import { UserModel } from '../../src/features/users/user.model.js'
import {
  createSocietyFixture,
  createUserFixture,
} from '../helpers/factories.js'

describe('operator admin recovery', () => {
  it('normalizes one admin email, re-enables admin, and returns one temporary credential', async () => {
    const society = await createSocietyFixture()
    const admin = await createUserFixture({
      societyId: society._id,
      role: 'admin',
      active: false,
      tokenVersion: 2,
    })

    const result = await recoverAdmin(` ${admin.email.toUpperCase()} `)
    expect(result.user).toMatchObject({
      id: admin.id,
      active: true,
      mustChangePassword: true,
    })
    expect(result.temporaryPassword).toHaveLength(16)
    expect((await UserModel.findById(admin.id))?.tokenVersion).toBe(3)
    const stored = await UserModel.findById(admin.id).select('+passwordHash')
    await expect(
      verifyPassword(result.temporaryPassword, stored!.passwordHash),
    ).resolves.toBe(true)
  })

  it('does not reveal whether a non-admin email exists', async () => {
    const society = await createSocietyFixture()
    const resident = await createUserFixture({
      societyId: society._id,
      role: 'resident',
    })
    await expect(recoverAdmin(resident.email)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    })
  })
})
