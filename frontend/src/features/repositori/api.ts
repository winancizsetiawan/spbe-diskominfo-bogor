import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Paged } from '@/api/client'
import type { Dokumen, StatusDokumen } from '@/features/dokumen/types'
import type { AdminDokumenFilter, HitunganStatus } from './types'

export const repositoriKeys = {
  semua: ['repositori'] as const,
  daftar: (filter: AdminDokumenFilter) => ['repositori', 'daftar', filter] as const,
}

function toQuery(filter: AdminDokumenFilter) {
  const params = new URLSearchParams({ page: String(filter.page) })
  if (filter.q) params.set('q', filter.q)
  if (filter.status) params.set('status', filter.status)
  return params.toString()
}

export type DaftarAdminDokumen = Paged<Dokumen> & { hitungan: HitunganStatus }

export function useDaftarAdminDokumen(filter: AdminDokumenFilter) {
  return useQuery({
    queryKey: repositoriKeys.daftar(filter),
    queryFn: () => api<DaftarAdminDokumen>(`/admin/dokumen?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

/** Perubahan status memengaruhi daftar pengguna (dokumen tampil atau hilang), jadi keduanya dimuat ulang. */
export function invalidasiRepositori(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: repositoriKeys.semua })
  void qc.invalidateQueries({ queryKey: ['dokumen'] })
}

export function useUbahStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusDokumen }) =>
      api<Dokumen>(`/dokumen/${id}`, { method: 'PATCH', json: { status } }),
    // 409 (status sudah berubah di tempat lain) juga perlu muat ulang agar tabel akurat.
    onSettled: () => invalidasiRepositori(qc),
  })
}
