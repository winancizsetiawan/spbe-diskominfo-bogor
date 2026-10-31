import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Paged } from '@/api/client'
import type { Aktivitas, PreferensiNotifikasi, ProfilSaya } from './types'

export const profilKeys = {
  semua: ['profil'] as const,
  data: ['profil', 'data'] as const,
  preferensi: ['profil', 'preferensi'] as const,
  aktivitas: (page: number) => ['profil', 'aktivitas', page] as const,
}

export function useProfil() {
  return useQuery({ queryKey: profilKeys.data, queryFn: () => api<ProfilSaya>('/profil') })
}

export function useUbahProfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { noTelepon: string | null }) => api<ProfilSaya>('/profil', { method: 'PUT', json: input }),
    onSuccess: (profil) => {
      qc.setQueryData(profilKeys.data, profil)
      // Perubahan tercatat di riwayat aktivitas.
      void qc.invalidateQueries({ queryKey: ['profil', 'aktivitas'] })
    },
  })
}

export function usePreferensi() {
  return useQuery({ queryKey: profilKeys.preferensi, queryFn: () => api<PreferensiNotifikasi>('/profil/preferensi') })
}

/** Saklar langsung berubah (optimistis) dan dikembalikan bila server menolak. */
export function useUbahPreferensi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PreferensiNotifikasi) => api<PreferensiNotifikasi>('/profil/preferensi', { method: 'PUT', json: input }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: profilKeys.preferensi })
      const sebelum = qc.getQueryData<PreferensiNotifikasi>(profilKeys.preferensi)
      qc.setQueryData(profilKeys.preferensi, input)
      return { sebelum }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.sebelum) qc.setQueryData(profilKeys.preferensi, ctx.sebelum)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['profil', 'aktivitas'] }),
  })
}

export function useAktivitas(page: number) {
  return useQuery({
    queryKey: profilKeys.aktivitas(page),
    queryFn: () => api<Paged<Aktivitas>>(`/profil/aktivitas?page=${page}`),
    placeholderData: keepPreviousData,
  })
}
