import { Router } from 'express'
import { authorize } from '../../http/authorize.js'
import {
  createUser,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateSelf,
  updateUser,
} from './user.controller.js'

export const userRoutes = Router()
userRoutes.patch('/me', updateSelf)
userRoutes.use(authorize('admin'))
userRoutes.get('/', listUsers)
userRoutes.post('/', createUser)
userRoutes.patch('/:id/status', setUserStatus)
userRoutes.post('/:id/reset-password', resetUserPassword)
userRoutes.patch('/:id', updateUser)
