import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DaftarPengguna, InstansiPengguna, Pengguna, PenggunaFilter, UbahPenggunaInput, UndangInput } from './types'

export const penggunaKeys = {
  semua: ['pengguna'] as const,
  daftar: (filter: PenggunaFilter) => ['pengguna', 'daftar', filter] as const,
  instansi: ['pengguna', 'instansi'] as const,
}

function toQuery(filter: PenggunaFilter) {
  const params = new URLSearchParams({ page: String(filter.page), role: filter.role })
  if (filter.q) params.set('q', filter.q)
  return params.toString()
}

export function useDaftarPengguna(filter: PenggunaFilter) {
  return useQuery({
    queryKey: penggunaKeys.daftar(filter),
    queryFn: () => api<DaftarPengguna>(`/pengguna?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function useInstansiPengguna() {
  return useQuery({
    queryKey: penggunaKeys.instansi,
    queryFn: () => api<InstansiPengguna[]>('/pengguna/instansi'),
    staleTime: Infinity,
  })
}

/** Hitungan per role ikut berubah, jadi seluruh cache pengguna dimuat ulang (juga setelah 409). */
function useMuatUlang() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: penggunaKeys.semua })
}

export function useUndangPengguna() {
  const muatUlang = useMuatUlang()
  return useMutation({
    mutationFn: (input: UndangInput) => api<Pengguna>('/pengguna', { method: 'POST', json: input }),
    onSuccess: muatUlang,
  })
}

export function useUbahPengguna() {
  const muatUlang = useMuatUlang()
  return useMutation({
    mutationFn: ({ id, ...input }: UbahPenggunaInput & { id: number }) =>
      api<Pengguna>(`/pengguna/${id}`, { method: 'PATCH', json: input }),
    onSettled: muatUlang,
  })
}

export function useUndangUlang() {
  return useMutation({
    mutationFn: (id: number) => api<void>(`/pengguna/${id}/undang-ulang`, { method: 'POST' }),
  })
}
