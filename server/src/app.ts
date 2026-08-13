import express, { Router, type Express } from 'express'
import path from 'node:path'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { AppError } from './http/app-error.js'
import { errorHandler } from './http/error-handler.js'
import { apiNotFound } from './http/not-found.js'
import { originGuard } from './http/origin-guard.js'
import { requestContext } from './http/request-context.js'
import cookieParser from 'cookie-parser'
import { createAuthRoutes } from './features/auth/auth.routes.js'
import { authorize } from './http/authorize.js'
import { createProtectedApiRouter } from './http/protected-api.js'
import { societyRoutes } from './features/societies/society.routes.js'
import { unitRoutes } from './features/units/unit.routes.js'
import { userRoutes } from './features/users/user.routes.js'
import { assetRoutes, scanRoutes } from './features/assets/asset.routes.js'
import { ticketRoutes } from './features/tickets/ticket.routes.js'
type AppOptions = {
  clientDistPath?: string
}

export function createApp(options: AppOptions = {}): Express {
  const app = express()
  app.set(
    'trust proxy',
    env.NODE_ENV === 'production' ? env.TRUST_PROXY_HOPS : 0,
  )

  app.use(requestContext)
  app.use(
    pinoHttp({
      redact: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.body.password',
        'req.body.temporaryPassword',
      ],
    }),
  )
  app.use(helmet())
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use(originGuard)

  app.get('/api/health/live', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })
  app.get('/api/health/ready', (_request, response, next) => {
    if (mongoose.connection.readyState === 1) {
      response.status(200).json({ status: 'ok' })
      return
    }
    next(new AppError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable.'))
  })
  app.use('/api', createAuthRoutes())
  const protectedSocietyRoutes = createProtectedApiRouter()
  protectedSocietyRoutes.use(societyRoutes)
  const protectedUnitRoutes = createProtectedApiRouter()
  protectedUnitRoutes.use(unitRoutes)
  app.use('/api/society', protectedSocietyRoutes)
  app.use('/api/units', protectedUnitRoutes)
  const protectedUserRoutes = createProtectedApiRouter()
  protectedUserRoutes.use(userRoutes)
  app.use('/api/users', protectedUserRoutes)
  const protectedAssetRoutes = createProtectedApiRouter()
  protectedAssetRoutes.use(assetRoutes)
  app.use('/api/assets', protectedAssetRoutes)
  const protectedScanRoutes = createProtectedApiRouter()
  protectedScanRoutes.use(scanRoutes)
  app.use('/api/scan', protectedScanRoutes)
  const protectedTicketRoutes = createProtectedApiRouter()
  protectedTicketRoutes.use(ticketRoutes)
  app.use('/api/tickets', protectedTicketRoutes)
  if (env.NODE_ENV === 'test') {
    const testProtectedApiRoutes = createProtectedApiRouter()
    const testResourceRoutes = Router()
    testResourceRoutes.get('/protected', (request, response) =>
      response.json({
        userId: request.actor.userId,
        tokenVersion: request.actor.tokenVersion,
      }),
    )
    testResourceRoutes.get('/protected-secondary', (_request, response) =>
      response.json({ protected: true }),
    )
    testResourceRoutes.get('/admin', authorize('admin'), (_request, response) =>
      response.json({ status: 'ok' }),
    )
    testProtectedApiRoutes.use(testResourceRoutes)
    app.use('/api/test', testProtectedApiRoutes)
  }

  app.use(apiNotFound)

  const clientDistPath =
    options.clientDistPath ??
    (env.NODE_ENV === 'production'
      ? path.resolve(process.cwd(), '../client/dist')
      : undefined)
  if (clientDistPath) {
    app.use(
      express.static(clientDistPath, {
        index: false,
        maxAge: '1h',
        setHeaders: (response, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            response.setHeader(
              'Cache-Control',
              'public, max-age=31536000, immutable',
            )
          }
        },
      }),
    )
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api/')) {
        next()
        return
      }
      response.sendFile(
        'index.html',
        {
          root: clientDistPath,
          headers: { 'Cache-Control': 'no-cache' },
        },
        (error) => {
          if (error) next(error)
        },
      )
    })
  }
  app.use(errorHandler)

  void env
  return app
}
