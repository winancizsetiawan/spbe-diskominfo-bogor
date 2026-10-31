import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type Paged } from '@/api/client'
import type {
  Balasan,
  BuatThreadInput,
  KategoriForum,
  LaporanInput,
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

export function useBalas(threadId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (konten: string) =>
      api<Balasan>(`/forum/thread/${threadId}/balasan`, { method: 'POST', json: { konten } }),
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
