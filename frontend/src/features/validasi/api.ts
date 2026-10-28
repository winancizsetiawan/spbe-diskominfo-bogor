import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { katalogKeys } from '@/features/katalog/api'
import type { DaftarPengajuan, Keputusan, PengajuanDetail, PengajuanFilter } from './types'

export const validasiKeys = {
  semua: ['validasi'] as const,
  daftar: (filter: PengajuanFilter) => ['validasi', 'daftar', filter] as const,
  detail: (id: number) => ['validasi', 'detail', id] as const,
}

function toQuery(filter: PengajuanFilter) {
  const params = new URLSearchParams({ page: String(filter.page) })
  if (filter.q) params.set('q', filter.q)
  if (filter.status) params.set('status', filter.status)
  return params.toString()
}

export function useDaftarPengajuan(filter: PengajuanFilter) {
  return useQuery({
    queryKey: validasiKeys.daftar(filter),
    queryFn: () => api<DaftarPengajuan>(`/validasi?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function usePengajuan(id: number) {
  return useQuery({
    queryKey: validasiKeys.detail(id),
    queryFn: () => api<PengajuanDetail>(`/validasi/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  })
}

export function useKeputusan(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { keputusan: Keputusan; catatan: string }) =>
      api<PengajuanDetail>(`/validasi/${id}/keputusan`, { method: 'POST', json: input }),
    // Berhasil maupun 409 (sudah diputuskan pihak lain): muat ulang antrean dan data aplikasinya.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: validasiKeys.semua })
      void qc.invalidateQueries({ queryKey: katalogKeys.semua })
      // Keputusan atas flowchart mengubah status flowchart yang mungkin sudah ada di cache (halaman tinjau memuat diagramnya).
      void qc.invalidateQueries({ queryKey: ['flowchart'] })
    },
  })
}
