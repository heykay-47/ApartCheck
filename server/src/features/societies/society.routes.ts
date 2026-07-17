import { Router } from 'express'
import { authorize } from '../../http/authorize.js'
import {
  getCurrentSociety,
  updateCurrentSociety,
} from './society.controller.js'

export const societyRoutes = Router()
societyRoutes.get('/', getCurrentSociety)
societyRoutes.patch('/', authorize('admin'), updateCurrentSociety)
