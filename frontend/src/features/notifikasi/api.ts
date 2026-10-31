import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DaftarNotifikasi, FilterKategori, NotifikasiFilter } from './types'

export const notifikasiKeys = {
  semua: ['notifikasi'] as const,
  ringkas: ['notifikasi', 'ringkas'] as const,
  daftar: (filter: NotifikasiFilter) => ['notifikasi', 'daftar', filter] as const,
}

/** Jumlah belum dibaca untuk lonceng di navbar; disegarkan berkala. */
export function useRingkasanNotifikasi() {
  return useQuery({
    queryKey: notifikasiKeys.ringkas,
    queryFn: () => api<{ belumDibaca: number }>('/notifikasi/ringkas'),
    refetchInterval: 60_000,
  })
}

export function useDaftarNotifikasi(filter: NotifikasiFilter) {
  return useQuery({
    queryKey: notifikasiKeys.daftar(filter),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(filter.page), kategori: filter.kategori })
      return api<DaftarNotifikasi>(`/notifikasi?${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

/** Lonceng dan semua daftar ikut berubah, jadi seluruh cache notifikasi dimuat ulang. */
function useMuatUlang() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: notifikasiKeys.semua })
}

export function useTandaiDibaca() {
  const muatUlang = useMuatUlang()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/notifikasi/${id}/dibaca`, { method: 'POST' }),
    onSettled: muatUlang,
  })
}

export function useTandaiSemuaDibaca() {
  const muatUlang = useMuatUlang()
  return useMutation({
    mutationFn: (kategori: FilterKategori = 'semua') =>
      api<{ diperbarui: number }>('/notifikasi/dibaca-semua', { method: 'POST', json: { kategori } }),
    onSettled: muatUlang,
  })
}
