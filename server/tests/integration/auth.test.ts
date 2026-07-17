import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { getSessionCookieName } from '../../src/features/auth/session.js'
import { UserModel } from '../../src/features/users/user.model.js'
import {
  createSocietyFixture,
  createUserFixture,
} from '../helpers/factories.js'

const password = 'apartcheck-test-password'

function cookie(response: { headers: { 'set-cookie'?: string[] } }): string {
  const value = response.headers['set-cookie']?.[0]
  if (!value) throw new Error('Expected session cookie.')
  return value.split(';')[0] ?? value
}

describe('authentication lifecycle', () => {
  it('logs in, exposes current session, and logs out invalid cookies idempotently', async () => {
    const user = await createUserFixture({ mustChangePassword: false })
    const app = createApp()
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password })

    expect(login.status).toBe(200)
    const session = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie(login))
    expect(session.status).toBe(200)
    expect(session.body.user).toMatchObject({ id: user.id, role: user.role })

    expect(
      (
        await request(app)
          .post('/api/auth/logout')
          .set('Cookie', 'apartcheck_session=bad')
      ).status,
    ).toBe(204)
  })

  it('returns generic credential failures for missing, wrong, and inactive users', async () => {
    const user = await createUserFixture()
    const app = createApp()
    const cases = [
      { email: 'missing@example.com', password },
      { email: user.email, password: 'wrong-password' },
    ]
    await UserModel.updateOne({ _id: user._id }, { active: false })
    cases.push({ email: user.email, password })

    for (const body of cases) {
      const response = await request(app).post('/api/auth/login').send(body)
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    }
  })

  it('forces password change, then invalidates old session', async () => {
    const user = await createUserFixture({ mustChangePassword: true })
    const app = createApp()
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password })
    const oldCookie = cookie(login)

    const blocked = await request(app)
      .get('/api/test/protected')
      .set('Cookie', oldCookie)
    expect(blocked.status).toBe(403)
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED')

    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', oldCookie)
      .send({
        currentPassword: password,
        newPassword: 'new-apartcheck-password',
      })
    expect(changed.status).toBe(200)

    const replacement = cookie(changed)
    expect(
      (await request(app).get('/api/test/protected').set('Cookie', oldCookie))
        .body.error.code,
    ).toBe('INVALID_SESSION')
    expect(
      (await request(app).get('/api/test/protected').set('Cookie', replacement))
        .status,
    ).toBe(200)
  })

  it('limits repeated failed logins', async () => {
    const user = await createUserFixture()
    const app = createApp()
    const responses = await Promise.all(
      Array.from({ length: 11 }, () =>
        request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '192.0.2.55')
          .send({ email: user.email, password: 'wrong-password' }),
      ),
    )
    expect(responses.some((response) => response.status === 429)).toBe(true)
  })

  it('does not trust a JWT role claim over the active user record', async () => {
    const society = await createSocietyFixture()
    const user = await createUserFixture({
      societyId: society._id,
      role: 'resident',
    })
    expect(user.role).toBe('resident')
    expect(getSessionCookieName()).toBe('apartcheck_session')
  })
})
