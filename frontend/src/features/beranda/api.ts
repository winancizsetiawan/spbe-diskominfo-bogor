import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Beranda, BerandaPublik } from './types'

export const berandaKeys = {
  beranda: ['beranda', 'saya'] as const,
  publik: ['beranda', 'publik'] as const,
}

/** Data Beranda disesuaikan server dengan role pengguna; bentuknya dibedakan oleh `tipe`. */
export function useBeranda() {
  return useQuery({
    queryKey: berandaKeys.beranda,
    queryFn: () => api<Beranda>('/beranda'),
    staleTime: 30_000,
  })
}

export function useBerandaPublik() {
  return useQuery({
    queryKey: berandaKeys.publik,
    queryFn: () => api<BerandaPublik>('/beranda/publik'),
    staleTime: 60_000,
  })
}
