import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

export interface KritikInput {
  nama: string
  email: string
  pesan: string
}

export interface Kritik extends KritikInput {
  id: number
  dibuatPada: string
}

export const BATAS_KRITIK = { namaMin: 2, namaMax: 100, pesanMin: 10, pesanMax: 1000 }

export function useKirimKritik() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: KritikInput) => api<void>('/kritik', { method: 'POST', json: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['kritik'] }),
  })
}

export function useDaftarKritik() {
  return useQuery({ queryKey: ['kritik'], queryFn: () => api<Kritik[]>('/kritik') })
}
