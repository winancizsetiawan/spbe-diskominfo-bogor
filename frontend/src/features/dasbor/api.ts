import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DasborInstansi } from './types'

export const dasborKeys = {
  instansi: (idInstansi?: number) => ['dasbor', 'instansi', idInstansi ?? 'sendiri'] as const,
}

/** Super Admin memilih instansi lewat `idInstansi`; Admin OPD selalu instansinya sendiri (server menegakkan). */
export function useDasborInstansi(idInstansi?: number) {
  return useQuery({
    queryKey: dasborKeys.instansi(idInstansi),
    queryFn: () => api<DasborInstansi>(`/dasbor/instansi${idInstansi ? `?idInstansi=${idInstansi}` : ''}`),
  })
}
