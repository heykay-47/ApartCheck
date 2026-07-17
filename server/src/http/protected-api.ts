import { Router } from 'express'
import { authenticate } from './authenticate.js'
import { requirePasswordChanged } from './require-password-change.js'

export function createProtectedApiRouter(): Router {
  const router = Router()
  router.use(authenticate)
  router.use(requirePasswordChanged)
  return router
}
