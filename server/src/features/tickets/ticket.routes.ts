import { Router } from 'express'
import { authorize } from '../../http/authorize.js'
import {
  archiveTicket,
  assignTicket,
  cancelTicket,
  createTicket,
  eligibleTechnicians,
  getTicket,
  listAssetTickets,
  listTickets,
  reopenTicket,
  returnTicket,
  startTicketWork,
  submitTicket,
  verifyTicket,
} from './ticket.controller.js'

export const ticketRoutes = Router()
ticketRoutes.get('/', listTickets)
ticketRoutes.post('/', authorize('admin', 'resident'), createTicket)
ticketRoutes.get(
  '/eligible-technicians',
  authorize('admin'),
  eligibleTechnicians,
)
ticketRoutes.get('/for-asset/:assetId', listAssetTickets)
ticketRoutes.get('/:id', getTicket)
ticketRoutes.put('/:id/assignment', authorize('admin'), assignTicket)
ticketRoutes.post('/:id/start-work', authorize('technician'), startTicketWork)
ticketRoutes.post('/:id/submit', authorize('technician'), submitTicket)
ticketRoutes.post('/:id/return', authorize('admin'), returnTicket)
ticketRoutes.post('/:id/verify', authorize('admin'), verifyTicket)
ticketRoutes.post('/:id/reopen', authorize('admin'), reopenTicket)
ticketRoutes.post('/:id/cancel', authorize('admin'), cancelTicket)
ticketRoutes.delete('/:id', authorize('admin'), archiveTicket)
