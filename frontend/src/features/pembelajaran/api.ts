import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DaftarKursus, KursusDetail } from './types'

export function useKursus() {
  return useQuery({ queryKey: ['kursus', 'daftar'], queryFn: () => api<DaftarKursus>('/kursus') })
}

export function useDetailKursus(id: number) {
  return useQuery({ queryKey: ['kursus', id], queryFn: () => api<KursusDetail>(`/kursus/${id}`) })
}

export function useSelesaikanMateri(idKursus: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idMateri: number) => api<KursusDetail>(`/kursus/${idKursus}/materi/${idMateri}/selesai`, { method: 'PUT' }),
    onSuccess: (data) => {
      qc.setQueryData(['kursus', idKursus], data)
      // Daftar memuat progres dan sertifikat; notifikasi dapat bertambah saat kursus tuntas.
      void qc.invalidateQueries({ queryKey: ['kursus', 'daftar'] })
      void qc.invalidateQueries({ queryKey: ['notifikasi'] })
    },
  })
}
