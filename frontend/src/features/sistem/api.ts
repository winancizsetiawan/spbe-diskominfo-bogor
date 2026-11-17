import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/api/client'
import { authAdapter } from '@/auth/adapter'
import { authReady } from '@/auth/ready'
import type {
  AuditFilter,
  DaftarAudit,
  DaftarBackup,
  DaftarPeriode,
  Periode,
  PeriodeInput,
  PratinjauDataDasbor,
  RiwayatBackup,
  StatusDataDasbor,
} from './types'

export const sistemKeys = {
  audit: (filter: AuditFilter) => ['sistem', 'audit', filter] as const,
  backup: ['sistem', 'backup'] as const,
  periode: ['sistem', 'periode'] as const,
  dataDasbor: ['sistem', 'data-dasbor'] as const,
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

export function useDataDasbor() {
  return useQuery({ queryKey: sistemKeys.dataDasbor, queryFn: () => api<StatusDataDasbor>('/dasbor/data') })
}

/** Unggah Excel untuk dipratinjau. Memakai fetch karena api() hanya mengirim JSON. */
export async function pratinjauDataDasbor(file: File, signal?: AbortSignal): Promise<PratinjauDataDasbor> {
  await authReady
  const form = new FormData()
  form.append('file', file)
  const token = await authAdapter.getToken()
  const res = await fetch('/api/dasbor/data/pratinjau', {
    method: 'POST',
    body: form,
    signal,
    headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new ApiError(res.status, res.status >= 500 || !body.message ? 'Excel gagal diolah. Silakan coba lagi.' : body.message)
  }
  return (await res.json()) as PratinjauDataDasbor
}

function useSetelahUbahDasbor() {
  const qc = useQueryClient()
  return (status: StatusDataDasbor) => {
    qc.setQueryData(sistemKeys.dataDasbor, status)
    // Dasbor Publik dan Analitik memakai data baru.
    void qc.invalidateQueries({ queryKey: ['dasbor'] })
  }
}

export function useTerapkanDataDasbor() {
  const setelah = useSetelahUbahDasbor()
  return useMutation({
    mutationFn: (idDraf: string) => api<StatusDataDasbor>('/dasbor/data/terapkan', { method: 'POST', json: { idDraf } }),
    onSuccess: setelah,
  })
}

export function usePulihkanDataDasbor() {
  const setelah = useSetelahUbahDasbor()
  return useMutation({
    mutationFn: (versi: string) => api<StatusDataDasbor>('/dasbor/data/pulihkan', { method: 'POST', json: { versi } }),
    onSuccess: setelah,
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
