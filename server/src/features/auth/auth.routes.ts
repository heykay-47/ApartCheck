import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import { bootstrapStatus, createBootstrap } from './auth.controller.js'

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

export const authRoutes = Router()
authRoutes.get('/bootstrap/status', bootstrapStatus)
authRoutes.post('/bootstrap', bootstrapLimiter, createBootstrap)
