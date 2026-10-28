import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { BATAS_CARI, type CariFilter, type DaftarCari } from './types'

export function useCari(filter: CariFilter) {
  const q = filter.q.trim()
  return useQuery({
    queryKey: ['cari', { ...filter, q }],
    queryFn: () => api<DaftarCari>(`/cari?${new URLSearchParams({ q, tipe: filter.tipe, page: String(filter.page) })}`),
    enabled: q.length >= BATAS_CARI.min,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
