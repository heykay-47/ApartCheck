import express, { type Express } from 'express'

export function createApp(): Express {
  const app = express()
  app.get('/api/health/live', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })
  return app
}
