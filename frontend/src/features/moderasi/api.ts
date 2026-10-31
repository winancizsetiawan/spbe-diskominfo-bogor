import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DaftarModerasi, ItemModerasi, ModerasiFilter, TindakanInput } from './types'

export const moderasiKeys = {
  semua: ['moderasi'] as const,
  daftar: (filter: ModerasiFilter) => ['moderasi', 'daftar', filter] as const,
}

function toQuery(filter: ModerasiFilter) {
  const params = new URLSearchParams({ tab: filter.tab, page: String(filter.page) })
  if (filter.q) params.set('q', filter.q)
  return params.toString()
}

export function useDaftarModerasi(filter: ModerasiFilter) {
  return useQuery({
    queryKey: moderasiKeys.daftar(filter),
    queryFn: () => api<DaftarModerasi>(`/moderasi?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function useTindakan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TindakanInput) => api<ItemModerasi>('/moderasi/tindakan', { method: 'POST', json: input }),
    // Berhasil maupun 409 (sudah ditindak): muat ulang antrean; forum juga berubah (thread terkunci/tersembunyi).
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: moderasiKeys.semua })
      void qc.invalidateQueries({ queryKey: ['forum'] })
    },
  })
}
