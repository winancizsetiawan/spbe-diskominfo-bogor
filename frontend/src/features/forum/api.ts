import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type Paged } from '@/api/client'
import { authAdapter } from '@/auth/adapter'
import { authReady } from '@/auth/ready'
import type {
  Balasan,
  BalasInput,
  BuatThreadInput,
  KategoriForum,
  LaporanInput,
  Lampiran,
  PenggunaForum,
  ThreadDetail,
  ThreadFilter,
  ThreadRingkas,
} from './types'

export const forumKeys = {
  kategori: ['forum', 'kategori'] as const,
  semuaDaftar: ['forum', 'daftar'] as const,
  daftar: (filter: ThreadFilter) => ['forum', 'daftar', filter] as const,
  detail: (id: number) => ['forum', 'detail', id] as const,
}

function toQuery(filter: ThreadFilter) {
  const params = new URLSearchParams({ page: String(filter.page) })
  if (filter.kategori) params.set('kategori', String(filter.kategori))
  if (filter.q) params.set('q', filter.q)
  return params.toString()
}

export function useKategoriForum() {
  return useQuery({
    queryKey: forumKeys.kategori,
    queryFn: () => api<KategoriForum[]>('/forum/kategori'),
    staleTime: Infinity,
  })
}

export function useDaftarThread(filter: ThreadFilter) {
  return useQuery({
    queryKey: forumKeys.daftar(filter),
    queryFn: () => api<Paged<ThreadRingkas>>(`/forum/thread?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function useThread(id: number) {
  return useQuery({
    queryKey: forumKeys.detail(id),
    queryFn: () => api<ThreadDetail>(`/forum/thread/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  })
}

export function useBuatThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BuatThreadInput) => api<ThreadDetail>('/forum/thread', { method: 'POST', json: input }),
    onSuccess: (thread) => {
      qc.setQueryData(forumKeys.detail(thread.id), thread)
      void qc.invalidateQueries({ queryKey: forumKeys.semuaDaftar })
    },
  })
}

export function useCariPengguna(q: string) {
  return useQuery({
    queryKey: ['forum', 'pengguna', q] as const,
    queryFn: () => api<PenggunaForum[]>(`/forum/pengguna?q=${encodeURIComponent(q)}`),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

/** Penugasan ulang: ganti daftar penerima thread. */
export function useUbahPenerima(threadId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (penerima: number[]) =>
      api<{ penerima: PenggunaForum[] }>(`/forum/thread/${threadId}/penerima`, { method: 'PUT', json: { penerima } }),
    onSuccess: ({ penerima }) => {
      qc.setQueryData<ThreadDetail>(forumKeys.detail(threadId), (t) => t && { ...t, penerima })
      void qc.invalidateQueries({ queryKey: forumKeys.semuaDaftar })
    },
  })
}

/** Unggah satu lampiran (gambar/PDF). Server memeriksa isi berkas dan memberi nama acak. */
export async function unggahLampiran(file: File, signal?: AbortSignal): Promise<Lampiran> {
  await authReady
  const form = new FormData()
  form.append('file', file)
  const token = await authAdapter.getToken()
  const res = await fetch('/api/forum/lampiran', {
    method: 'POST',
    body: form,
    signal,
    headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new ApiError(res.status, res.status >= 500 || !body.message ? 'Lampiran gagal diunggah. Silakan coba lagi.' : body.message)
  }
  return (await res.json()) as Lampiran
}

export function useBalas(threadId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BalasInput) =>
      api<Balasan>(`/forum/thread/${threadId}/balasan`, { method: 'POST', json: input }),
    onSuccess: (balasan) => {
      qc.setQueryData<ThreadDetail>(forumKeys.detail(threadId), (t) =>
        t && { ...t, balasan: [...t.balasan, balasan], jumlahBalasan: t.jumlahBalasan + 1 },
      )
      void qc.invalidateQueries({ queryKey: forumKeys.semuaDaftar })
    },
    onError: (err) => {
      // 409: thread baru saja dikunci/disembunyikan; muat ulang agar UI menampilkan status terbaru.
      if (err instanceof ApiError && err.status === 409) {
        void qc.invalidateQueries({ queryKey: forumKeys.detail(threadId) })
      }
    },
  })
}

/** Nilai balasan (toggle) dengan pembaruan optimistis; dikembalikan bila server menolak. */
export function useNilaiBalasan(threadId: number) {
  const qc = useQueryClient()
  const key = forumKeys.detail(threadId)
  const ubah = (balasanId: number, fn: (b: Balasan) => Balasan) =>
    qc.setQueryData<ThreadDetail>(key, (t) =>
      t && { ...t, balasan: t.balasan.map((b) => (b.id === balasanId ? fn(b) : b)) },
    )

  return useMutation({
    mutationFn: (balasanId: number) =>
      api<Pick<Balasan, 'jumlahNilai' | 'sudahDinilai'>>(`/forum/balasan/${balasanId}/nilai`, { method: 'PUT' }),
    onMutate: async (balasanId) => {
      await qc.cancelQueries({ queryKey: key })
      const sebelum = qc.getQueryData<ThreadDetail>(key)
      ubah(balasanId, (b) => ({
        ...b,
        sudahDinilai: !b.sudahDinilai,
        jumlahNilai: b.jumlahNilai + (b.sudahDinilai ? -1 : 1),
      }))
      return { sebelum }
    },
    onError: (_err, _balasanId, ctx) => {
      if (ctx?.sebelum) qc.setQueryData(key, ctx.sebelum)
    },
    onSuccess: (hasil, balasanId) => ubah(balasanId, (b) => ({ ...b, ...hasil })),
  })
}

export function useLaporkan() {
  return useMutation({
    mutationFn: (input: LaporanInput) => api<void>('/forum/laporan', { method: 'POST', json: input }),
  })
}
