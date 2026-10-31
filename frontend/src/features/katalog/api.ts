import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Paged } from '@/api/client'
import type {
  Aplikasi,
  AplikasiFilter,
  AplikasiInput,
  HasilAjukan,
  Instansi,
  NodeRaa,
  RingkasanAplikasi,
} from './types'

export const katalogKeys = {
  semua: ['katalog'] as const,
  ringkasan: ['katalog', 'ringkasan'] as const,
  daftar: (filter: AplikasiFilter) => ['katalog', 'daftar', filter] as const,
  detail: (id: number) => ['katalog', 'detail', id] as const,
  siapDiajukan: ['katalog', 'siap-diajukan'] as const,
  referensiRaa: ['referensi', 'raa'] as const,
  referensiInstansi: ['referensi', 'instansi'] as const,
}

function toQuery(filter: AplikasiFilter) {
  const params = new URLSearchParams({ page: String(filter.page) })
  if (filter.q) params.set('q', filter.q)
  if (filter.statusValidasi) params.set('statusValidasi', filter.statusValidasi)
  if (filter.statusRaa) params.set('statusRaa', filter.statusRaa)
  return params.toString()
}

export function useRingkasanAplikasi() {
  return useQuery({
    queryKey: katalogKeys.ringkasan,
    queryFn: () => api<RingkasanAplikasi>('/aplikasi/ringkasan'),
  })
}

export function useDaftarAplikasi(filter: AplikasiFilter) {
  return useQuery({
    queryKey: katalogKeys.daftar(filter),
    queryFn: () => api<Paged<Aplikasi>>(`/aplikasi?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function useAplikasi(id: number | undefined) {
  return useQuery({
    queryKey: katalogKeys.detail(id ?? 0),
    queryFn: () => api<Aplikasi>(`/aplikasi/${id}`),
    enabled: id !== undefined && Number.isInteger(id) && id > 0,
  })
}

export function useReferensiRaa() {
  return useQuery({
    queryKey: katalogKeys.referensiRaa,
    queryFn: () => api<NodeRaa[]>('/referensi/raa'),
    staleTime: Infinity,
  })
}

export function useReferensiInstansi(enabled: boolean) {
  return useQuery({
    queryKey: katalogKeys.referensiInstansi,
    queryFn: () => api<Instansi[]>('/referensi/instansi'),
    staleTime: Infinity,
    enabled,
  })
}

/** Tambah (tanpa id) atau ubah aplikasi. Mengubah data mengembalikan status ke Draft. */
export function useSimpanAplikasi(id?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AplikasiInput) =>
      id
        ? api<Aplikasi>(`/aplikasi/${id}`, { method: 'PUT', json: input })
        : api<Aplikasi>('/aplikasi', { method: 'POST', json: input }),
    onSuccess: (aplikasi) => {
      qc.setQueryData(katalogKeys.detail(aplikasi.id), aplikasi)
      void qc.invalidateQueries({ queryKey: katalogKeys.semua })
    },
  })
}

export function useSiapDiajukan(enabled: boolean) {
  return useQuery({
    queryKey: katalogKeys.siapDiajukan,
    queryFn: () => api<Pick<Aplikasi, 'id' | 'nama'>[]>('/aplikasi/siap-diajukan'),
    enabled,
  })
}

export function useAjukanValidasi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { jenisData: 'aplikasi' | 'raa'; targetIds: number[] }) =>
      api<HasilAjukan>('/validasi', { method: 'POST', json: input }),
    // Berhasil maupun 409 (status sudah berubah): muat ulang agar status di tabel terbaru.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: katalogKeys.semua })
      void qc.invalidateQueries({ queryKey: ['validasi'] })
    },
  })
}
