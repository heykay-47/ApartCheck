import { Router } from 'express'
import { authorize } from '../../http/authorize.js'
import {
  archiveAsset,
  createAsset,
  downloadQr,
  getAsset,
  listAssets,
  scanAsset,
  updateAsset,
} from './asset.controller.js'

export const assetRoutes = Router()
assetRoutes.get('/', listAssets)
assetRoutes.post('/', authorize('admin'), createAsset)
assetRoutes.get('/:id/qr.svg', authorize('admin'), downloadQr)
assetRoutes.get('/:id', getAsset)
assetRoutes.patch('/:id', authorize('admin'), updateAsset)
assetRoutes.delete('/:id', authorize('admin'), archiveAsset)

export const scanRoutes = Router()
scanRoutes.get('/:token', scanAsset)
