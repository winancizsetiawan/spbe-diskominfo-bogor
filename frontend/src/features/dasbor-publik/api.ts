import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DasborPublik } from './types'

/**
 * Data dasbor berubah jarang (diolah dari matriks arsitektur), jadi boleh disimpan lama.
 * `internal`: versi lengkap tanpa batasan, hanya untuk pengguna yang sudah masuk.
 */
export function useDasborArsitektur(internal: boolean) {
  return useQuery({
    queryKey: ['dasbor', internal ? 'analitik' : 'publik'],
    queryFn: () => api<DasborPublik>(internal ? '/dasbor/analitik' : '/dasbor/publik'),
    staleTime: 10 * 60_000,
  })
}
