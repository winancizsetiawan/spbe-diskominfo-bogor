import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { ArtikelDetail, Bantuan, DaftarArtikel, FilterJenis } from './types'

export function useDaftarArtikel(jenis: FilterJenis, page: number) {
  return useQuery({
    queryKey: ['konten', 'artikel', jenis, page],
    queryFn: () => api<DaftarArtikel>(`/artikel?jenis=${jenis}&page=${page}`),
    placeholderData: keepPreviousData,
  })
}

export function useArtikel(id: number) {
  return useQuery({ queryKey: ['konten', 'artikel', id], queryFn: () => api<ArtikelDetail>(`/artikel/${id}`) })
}

export function useBantuan() {
  return useQuery({ queryKey: ['konten', 'bantuan'], queryFn: () => api<Bantuan>('/bantuan'), staleTime: Infinity })
}
