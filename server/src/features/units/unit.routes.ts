import { Router } from 'express'
import { authorize } from '../../http/authorize.js'
import {
  archiveUnit,
  createUnit,
  getUnit,
  listUnits,
  updateUnit,
} from './unit.controller.js'

export const unitRoutes = Router()
unitRoutes.use(authorize('admin'))
unitRoutes.get('/', listUnits)
unitRoutes.post('/', createUnit)
unitRoutes.get('/:id', getUnit)
unitRoutes.patch('/:id', updateUnit)
unitRoutes.delete('/:id', archiveUnit)
