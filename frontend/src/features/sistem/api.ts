import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AuditFilter, DaftarAudit, DaftarBackup, DaftarPeriode, Periode, PeriodeInput, RiwayatBackup } from './types'

export const sistemKeys = {
  audit: (filter: AuditFilter) => ['sistem', 'audit', filter] as const,
  backup: ['sistem', 'backup'] as const,
  periode: ['sistem', 'periode'] as const,
}

function auditQuery(filter: AuditFilter) {
  const params = new URLSearchParams({ page: String(filter.page), kategori: filter.kategori })
  for (const kunci of ['aksi', 'hasil', 'q', 'dari', 'sampai'] as const) {
    if (filter[kunci]) params.set(kunci, filter[kunci])
  }
  return params.toString()
}

export function useAudit(filter: AuditFilter) {
  return useQuery({
    queryKey: sistemKeys.audit(filter),
    queryFn: () => api<DaftarAudit>(`/audit?${auditQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

/** Selama ada backup berjalan, daftar dimuat ulang berkala sampai hasilnya diketahui. */
export function useBackup() {
  return useQuery({
    queryKey: sistemKeys.backup,
    queryFn: () => api<DaftarBackup>('/backup'),
    refetchInterval: (q) => (q.state.data?.items.some((b) => b.status === 'berjalan') ? 2000 : false),
  })
}

export function useJalankanBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<RiwayatBackup>('/backup', { method: 'POST' }),
    // Juga saat 409: backup lain sedang berjalan, tampilan perlu menyesuaikan.
    onSettled: () => void qc.invalidateQueries({ queryKey: sistemKeys.backup }),
  })
}

export function usePeriode() {
  return useQuery({ queryKey: sistemKeys.periode, queryFn: () => api<DaftarPeriode>('/periode') })
}

function useMuatUlangPeriode() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: sistemKeys.periode })
}

export function useSimpanPeriode() {
  const muatUlang = useMuatUlangPeriode()
  return useMutation({
    mutationFn: ({ id, ...input }: PeriodeInput & { id?: number }) =>
      id
        ? api<Periode>(`/periode/${id}`, { method: 'PUT', json: input })
        : api<Periode>('/periode', { method: 'POST', json: input }),
    onSettled: muatUlang,
  })
}

export function useHapusPeriode() {
  const muatUlang = useMuatUlangPeriode()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/periode/${id}`, { method: 'DELETE' }),
    onSettled: muatUlang,
  })
}
