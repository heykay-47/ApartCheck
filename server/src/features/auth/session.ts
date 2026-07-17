import type { Response } from 'express'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { env } from '../../config/env.js'

export type SessionPayload = {
  sub: string
  societyId: string
  tokenVersion: number
}

const sessionDurationSeconds = 8 * 60 * 60
const sessionCookiePath = '/'
const sessionCookieAttributes = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: sessionCookiePath,
}

export function getSessionCookieName(): string {
  return env.NODE_ENV === 'production'
    ? '__Host-apartcheck_session'
    : 'apartcheck_session'
}

function sessionCookieOptions() {
  return {
    ...sessionCookieAttributes,
    maxAge: sessionDurationSeconds * 1000,
  }
}

export function signSession(payload: SessionPayload): string {
  const options: SignOptions = { algorithm: 'HS256', expiresIn: '8h' }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  })

  if (!isValidSessionPayload(decoded)) {
    throw new Error('Invalid session payload.')
  }

  return {
    sub: decoded.sub,
    societyId: decoded.societyId,
    tokenVersion: decoded.tokenVersion,
  }
}

function isValidNumericDate(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isValidSessionPayload(
  decoded: string | JwtPayload,
): decoded is JwtPayload & SessionPayload {
  return (
    typeof decoded !== 'string' &&
    typeof decoded.sub === 'string' &&
    typeof decoded.societyId === 'string' &&
    Number.isInteger(decoded.tokenVersion) &&
    decoded.tokenVersion >= 0 &&
    isValidNumericDate(decoded.iat) &&
    isValidNumericDate(decoded.exp) &&
    (decoded.nbf === undefined || isValidNumericDate(decoded.nbf))
  )
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(getSessionCookieName(), token, sessionCookieOptions())
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(getSessionCookieName(), sessionCookieAttributes)
}
