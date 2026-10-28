import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DasborInstansi, EmbedDasbor, JenisDasbor } from './types'

export const dasborKeys = {
  instansi: (idInstansi?: number) => ['dasbor', 'instansi', idInstansi ?? 'sendiri'] as const,
  embed: (jenis: JenisDasbor, idInstansi?: number) => ['dasbor', 'embed', jenis, idInstansi ?? 'sendiri'] as const,
}

/** Super Admin memilih instansi lewat `idInstansi`; Admin OPD selalu instansinya sendiri (server menegakkan). */
export function useDasborInstansi(idInstansi?: number) {
  return useQuery({
    queryKey: dasborKeys.instansi(idInstansi),
    queryFn: () => api<DasborInstansi>(`/dasbor/instansi${idInstansi ? `?idInstansi=${idInstansi}` : ''}`),
  })
}

/**
 * Minta URL embed Metabase. Tidak di-cache lintas waktu kedaluwarsa: halaman memuat ulang
 * bila pengguna meminta, jadi `staleTime` tak terbatas dan `gcTime` 0 agar URL lama tidak dipakai ulang.
 */
export function useEmbedDasbor(jenis: JenisDasbor, idInstansi?: number) {
  return useQuery({
    queryKey: dasborKeys.embed(jenis, idInstansi),
    queryFn: () => {
      const params = new URLSearchParams({ jenis })
      if (idInstansi) params.set('idInstansi', String(idInstansi))
      return api<EmbedDasbor>(`/dasbor/embed?${params}`)
    },
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: 'always',
  })
}
