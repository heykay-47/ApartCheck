import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../app/api'

export type AssetCategory = 'lift' | 'plumbing' | 'electrical'
export type Asset = {
  id: string
  assetCode: string
  name: string
  category: AssetCategory
  locationDescription: string
  installDate: string | null
  archivedAt: string | null
}
export type AssetFilters = {
  page: number
  pageSize: number
  search: string
  category: AssetCategory | ''
}
export type AssetList = AssetFilters & {
  assets: Asset[]
  pagination: Pagination
}
export type Pagination = {
  page: number
  pageSize: number
  total: number
  pages: number
}
export type AssetInput = {
  name: string
  category: AssetCategory
  locationDescription: string
  installDate?: string
}

export const assetCategories: { value: AssetCategory; label: string }[] = [
  { value: 'lift', label: 'Lift' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
]

function paramsFor(filters: AssetFilters) {
  return new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  })
}

export function useAssets(filters: AssetFilters) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: () => api<AssetList>(`/api/assets?${paramsFor(filters)}`),
  })
}
export function useAsset(id: string) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => api<{ asset: Asset }>(`/api/assets/${id}`),
    enabled: Boolean(id),
    select: (data) => data.asset,
  })
}
export function useScanAsset(token: string) {
  return useQuery({
    queryKey: ['asset-scan', token],
    queryFn: () => api<{ asset: Asset }>(`/api/scan/${token}`),
    enabled: Boolean(token),
    retry: false,
    select: (data) => data.asset,
  })
}
export function useCreateAsset() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AssetInput) =>
      api<{ asset: Asset }>('/api/assets', {
        method: 'POST',
        body: JSON.stringify(serverInput(input)),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['assets'] }),
  })
}

function serverInput(input: AssetInput): AssetInput {
  return input.installDate
    ? { ...input, installDate: `${input.installDate}T00:00:00.000Z` }
    : input
}

export function useUpdateAsset(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AssetInput) =>
      api<{ asset: Asset }>(`/api/assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(serverInput(input)),
      }),
    onSuccess: (data) => {
      client.setQueryData(['asset', id], data)
      return client.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}
export function useArchiveAsset() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/assets/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: ['asset', id] })
      return client.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}
export async function fetchAssetQr(id: string) {
  const response = await fetch(`/api/assets/${id}/qr.svg`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('QR image unavailable.')
  return URL.createObjectURL(await response.blob())
}
