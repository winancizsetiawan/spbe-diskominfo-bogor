import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, type Paged } from '@/api/client'
import { authAdapter } from '@/auth/adapter'
import { authReady } from '@/auth/ready'
import { useSession } from '@/auth/session'
import type { User } from '@/auth/types'
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

export function useUnggahFotoProfil() {
  const qc = useQueryClient()
  const { user, setUser } = useSession()
  return useMutation({
    mutationFn: async (file: File) => {
      await authReady
      const form = new FormData()
      form.append('file', file)
      const token = await authAdapter.getToken()
      const res = await fetch('/api/profil/foto', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new ApiError(res.status, res.status >= 500 || !body.message ? 'Foto profil gagal diunggah. Silakan coba lagi.' : body.message)
      }
      return (await res.json()) as ProfilSaya
    },
    onSuccess: (profil) => {
      qc.setQueryData(profilKeys.data, profil)
      if (user) setUser({ ...user, fotoProfil: profil.fotoProfil ?? null })
      void qc.invalidateQueries({ queryKey: ['profil', 'aktivitas'] })
    },
  })
}

export function useHapusFotoProfil() {
  const qc = useQueryClient()
  const { user, setUser } = useSession()
  return useMutation({
    mutationFn: () => api<ProfilSaya>('/profil/foto', { method: 'DELETE' }),
    onSuccess: (profil) => {
      qc.setQueryData(profilKeys.data, profil)
      if (user) setUser({ ...user, fotoProfil: null })
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

export function useUbahSandi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { sandiLama: string; sandiBaru: string; konfirmasiSandi: string }) =>
      api<User>('/auth/ubah-sandi', { method: 'POST', json: input }),
    onSuccess: (updatedUser) => {
      useSession.getState().setUser(updatedUser)
      void qc.invalidateQueries({ queryKey: ['profil', 'aktivitas'] })
    },
  })
}

export function useSimulasiKedaluwarsaSandi() {
  return useMutation({
    mutationFn: (kedaluwarsa: boolean) =>
      api<User>('/auth/simulasi-kedaluwarsa', { method: 'POST', json: { kedaluwarsa } }),
    onSuccess: (updatedUser) => {
      useSession.getState().setUser(updatedUser)
    },
  })
}

export function useMulaiSetup2FA() {
  return useMutation({
    mutationFn: () => api<{ secret: string; uri: string }>('/profil/2fa/mulai', { method: 'POST' }),
  })
}

export function useAktifkan2FA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (kode: string) => api<User>('/profil/2fa/aktifkan', { method: 'POST', json: { kode } }),
    onSuccess: (updatedUser) => {
      useSession.getState().setUser(updatedUser)
      void qc.invalidateQueries({ queryKey: ['profil', 'aktivitas'] })
    },
  })
}

export function useNonaktifkan2FA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<User>('/profil/2fa/nonaktifkan', { method: 'POST' }),
    onSuccess: (updatedUser) => {
      useSession.getState().setUser(updatedUser)
      void qc.invalidateQueries({ queryKey: ['profil', 'aktivitas'] })
    },
  })
}
