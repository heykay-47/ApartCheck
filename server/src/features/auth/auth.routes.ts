import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import {
  bootstrapStatus,
  changePassword,
  createBootstrap,
  createLogin,
  currentSession,
  logout,
} from './auth.controller.js'
import { authenticate } from '../../http/authenticate.js'

const bootstrapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (request, response) => {
    response.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many bootstrap attempts. Try again later.',
        requestId: request.id ?? randomUUID(),
      },
    })
  },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (request, response) => {
    response.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Try again later.',
        requestId: request.id,
      },
    })
  },
})

export const authRoutes = Router()
authRoutes.get('/bootstrap/status', bootstrapStatus)
authRoutes.post('/bootstrap', bootstrapLimiter, createBootstrap)
authRoutes.post('/auth/login', loginLimiter, createLogin)
authRoutes.post('/auth/logout', logout)
authRoutes.get('/auth/me', authenticate, currentSession)
authRoutes.post('/auth/change-password', authenticate, changePassword)
