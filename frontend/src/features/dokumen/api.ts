import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Paged } from '@/api/client'
import type {
  Dokumen,
  DokumenFilter,
  HasilUnduh,
  Kelompok,
  KategoriDokumen,
  RingkasanDokumen,
} from './types'

export const dokumenKeys = {
  semua: ['dokumen'] as const,
  daftar: (filter: DokumenFilter) => ['dokumen', 'daftar', filter] as const,
  ringkasan: (kelompok: Kelompok) => ['dokumen', 'ringkasan', kelompok] as const,
  kategori: (kelompok: Kelompok) => ['dokumen', 'kategori', kelompok] as const,
  detail: (id: number) => ['dokumen', 'detail', id] as const,
}

function toQuery(filter: DokumenFilter) {
  const params = new URLSearchParams({ kelompok: filter.kelompok, page: String(filter.page), urut: filter.urut })
  if (filter.q) params.set('q', filter.q)
  if (filter.jenis) params.set('jenis', filter.jenis)
  if (filter.kategori) params.set('kategori', String(filter.kategori))
  return params.toString()
}

export function useDaftarDokumen(filter: DokumenFilter) {
  return useQuery({
    queryKey: dokumenKeys.daftar(filter),
    queryFn: () => api<Paged<Dokumen>>(`/dokumen?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function useRingkasanDokumen(kelompok: Kelompok) {
  return useQuery({
    queryKey: dokumenKeys.ringkasan(kelompok),
    queryFn: () => api<RingkasanDokumen>(`/dokumen/ringkasan?kelompok=${kelompok}`),
  })
}

export function useKategoriDokumen(kelompok: Kelompok, enabled: boolean) {
  return useQuery({
    queryKey: dokumenKeys.kategori(kelompok),
    queryFn: () => api<KategoriDokumen[]>(`/dokumen/kategori?kelompok=${kelompok}`),
    staleTime: Infinity,
    enabled,
  })
}

export function useDokumen(id: number) {
  return useQuery({
    queryKey: dokumenKeys.detail(id),
    queryFn: () => api<Dokumen>(`/dokumen/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  })
}

/** Meminta URL unduhan; server mencatat unduhan dan menaikkan hitungannya. */
export function useUnduh(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<HasilUnduh>(`/dokumen/${id}/unduh`),
    onSuccess: () => {
      qc.setQueryData<Dokumen>(dokumenKeys.detail(id), (d) => d && { ...d, jumlahUnduhan: d.jumlahUnduhan + 1 })
      // Hitungan di daftar dan ringkasan ikut berubah; muat ulang tanpa mengganggu halaman detail.
      void qc.invalidateQueries({ queryKey: ['dokumen', 'daftar'] })
      void qc.invalidateQueries({ queryKey: ['dokumen', 'ringkasan'] })
    },
  })
}
