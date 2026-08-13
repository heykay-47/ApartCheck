import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../app/api'
import type { Role } from '../auth/auth-api'
import type { Pagination } from '../assets/asset-api'
import type { Unit } from '../units/unit-api'

export const ticketStatuses = [
  'open',
  'assigned',
  'in_progress',
  'awaiting_verification',
  'completed',
  'cancelled',
] as const
export type TicketStatus = (typeof ticketStatuses)[number]
export type TicketEventType =
  | 'created'
  | 'assigned'
  | 'reassigned'
  | 'work_started'
  | 'submitted_for_verification'
  | 'returned'
  | 'verified'
  | 'reopened'
  | 'cancelled'
  | 'archived'
export type TicketPerson = {
  id: string
  name: string
  active?: boolean
  role?: Role | null
}
export type TicketUnit = Unit & { active: boolean }
export type TicketAsset = {
  id: string
  assetCode: string
  name: string
  active: boolean
}
export type TicketSummary = {
  id: string
  title: string
  status: TicketStatus
  unit: TicketUnit
  asset: TicketAsset | null
  reporter: TicketPerson
  assignee: TicketPerson | null
  createdAt: string
  updatedAt: string
}
export type TicketEvent = {
  id: string
  type: TicketEventType
  fromStatus: TicketStatus | null
  toStatus: TicketStatus
  actor: TicketPerson
  assignee: TicketPerson | null
  note: string | null
  createdAt: string
}
export type Ticket = TicketSummary & {
  description: string
  events: TicketEvent[]
}
export type TicketFilters = {
  page: number
  pageSize: number
  search: string
  status: TicketStatus | ''
}
export type TicketList = { tickets: TicketSummary[]; pagination: Pagination }
export type TicketInput = {
  unitId: string
  assetId?: string | null
  title: string
  description: string
}
export type EligibleTechnician = { id: string; name: string; email: string }
export type EligibleTechnicianFilters = {
  page: number
  pageSize: number
  search: string
}
export type TicketEventInput = { reason: string }

export const ticketKeys = {
  all: ['tickets'] as const,
  detail: (id: string) => ['ticket', id] as const,
  asset: (assetId: string, filters: TicketFilters) =>
    ['asset-tickets', assetId, filters] as const,
  eligibleTechnicians: (filters: EligibleTechnicianFilters) =>
    ['eligible-technicians', filters] as const,
}

function paramsFor(filters: Partial<TicketFilters>) {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    pageSize: String(filters.pageSize ?? 25),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  return params
}

export function useTickets(filters: TicketFilters) {
  return useQuery({
    queryKey: [...ticketKeys.all, filters],
    queryFn: () => api<TicketList>(`/api/tickets?${paramsFor(filters)}`),
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => api<{ ticket: Ticket }>(`/api/tickets/${id}`),
    enabled: Boolean(id),
    select: (response) => response.ticket,
  })
}

export function useAssetTickets(
  assetId: string,
  filters: TicketFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: ticketKeys.asset(assetId, filters),
    queryFn: () =>
      api<TicketList>(
        `/api/tickets/for-asset/${assetId}?${paramsFor(filters)}`,
      ),
    enabled: Boolean(assetId) && enabled,
  })
}

export function useEligibleTechnicians(filters: EligibleTechnicianFilters) {
  return useQuery({
    queryKey: ticketKeys.eligibleTechnicians(filters),
    queryFn: () =>
      api<{ technicians: EligibleTechnician[]; pagination: Pagination }>(
        `/api/tickets/eligible-technicians?${paramsFor(filters)}`,
      ),
  })
}

export function useMyUnit(enabled = true) {
  return useQuery({
    queryKey: ['my-unit'],
    queryFn: () => api<{ unit: Unit }>('/api/units/me'),
    enabled,
  })
}

function useTicketMutation<TInput>(
  mutationFn: (input: TInput) => Promise<{ ticket: Ticket }>,
  options: { gcTime?: number } = {},
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: async (data) => {
      client.setQueryData(ticketKeys.detail(data.ticket.id), data)
      await client.invalidateQueries({ queryKey: ticketKeys.all })
      await client.invalidateQueries({ queryKey: ['asset-tickets'] })
    },
  })
}

export function useCreateTicket() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: TicketInput) =>
      api<{ ticket: Ticket }>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async (data) => {
      client.setQueryData(ticketKeys.detail(data.ticket.id), data)
      await client.invalidateQueries({ queryKey: ticketKeys.all })
      await client.invalidateQueries({ queryKey: ['asset-tickets'] })
    },
  })
}

export function useAssignTicket(id: string) {
  return useTicketMutation((input: { technicianId: string }) =>
    api<{ ticket: Ticket }>(`/api/tickets/${id}/assignment`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  )
}

export function useStartTicketWork(id: string) {
  return useTicketMutation(() =>
    api<{ ticket: Ticket }>(`/api/tickets/${id}/start-work`, {
      method: 'POST',
    }),
  )
}

export function useSubmitTicket(id: string) {
  return useTicketMutation(
    (input: { completionSummary: string }) =>
      api<{ ticket: Ticket }>(`/api/tickets/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    { gcTime: 0 },
  )
}

export function useReturnTicket(id: string) {
  return useTicketMutation(
    (input: TicketEventInput) =>
      api<{ ticket: Ticket }>(`/api/tickets/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    { gcTime: 0 },
  )
}

export function useVerifyTicket(id: string) {
  return useTicketMutation(() =>
    api<{ ticket: Ticket }>(`/api/tickets/${id}/verify`, { method: 'POST' }),
  )
}

export function useReopenTicket(id: string) {
  return useTicketMutation(
    (input: TicketEventInput) =>
      api<{ ticket: Ticket }>(`/api/tickets/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    { gcTime: 0 },
  )
}

export function useCancelTicket(id: string) {
  return useTicketMutation(
    (input: TicketEventInput) =>
      api<{ ticket: Ticket }>(`/api/tickets/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    { gcTime: 0 },
  )
}

export function useArchiveTicket() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: async (_, id) => {
      client.removeQueries({ queryKey: ticketKeys.detail(id), exact: true })
      await client.invalidateQueries({ queryKey: ticketKeys.all })
      await client.invalidateQueries({ queryKey: ['asset-tickets'] })
    },
  })
}
