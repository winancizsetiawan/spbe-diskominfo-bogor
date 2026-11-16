import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { ArtikelDetail, ArtikelInput, Bantuan, DaftarArtikel, FilterJenis } from './types'

/** Khusus Super Admin; server menolak peran lain dengan 403. */
export function useBuatArtikel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ArtikelInput) => api<ArtikelDetail>('/artikel', { method: 'POST', json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['konten', 'artikel'] }),
  })
}

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
