import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  DaftarFlowchart,
  FlowchartDetail,
  FlowchartFilter,
  FlowchartInput,
  OpsiFlowchart,
} from './types'

export const flowchartKeys = {
  semua: ['flowchart'] as const,
  daftar: (filter: FlowchartFilter) => ['flowchart', 'daftar', filter] as const,
  detail: (id: number) => ['flowchart', 'detail', id] as const,
  opsi: ['flowchart', 'opsi'] as const,
}

function toQuery(filter: FlowchartFilter) {
  const params = new URLSearchParams({ page: String(filter.page) })
  if (filter.q) params.set('q', filter.q)
  if (filter.kategori) params.set('kategori', filter.kategori)
  if (filter.status) params.set('status', filter.status)
  return params.toString()
}

export function useDaftarFlowchart(filter: FlowchartFilter) {
  return useQuery({
    queryKey: flowchartKeys.daftar(filter),
    queryFn: () => api<DaftarFlowchart>(`/flowchart?${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function useFlowchart(id: number | undefined) {
  return useQuery({
    queryKey: flowchartKeys.detail(id ?? 0),
    queryFn: () => api<FlowchartDetail>(`/flowchart/${id}`),
    enabled: id !== undefined && Number.isInteger(id) && id > 0,
  })
}

/** Daftar aplikasi instansi dan SOP untuk dipilih sebagai keterkaitan. */
export function useOpsiFlowchart() {
  return useQuery({
    queryKey: flowchartKeys.opsi,
    queryFn: () => api<OpsiFlowchart>('/flowchart/opsi'),
    staleTime: 60_000,
  })
}

/** Tambah (tanpa id) atau ubah. Mengubah membuat versi baru dan mengembalikan status ke Draft. */
export function useSimpanFlowchart(id?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FlowchartInput) =>
      id
        ? api<FlowchartDetail>(`/flowchart/${id}`, { method: 'PUT', json: input })
        : api<FlowchartDetail>('/flowchart', { method: 'POST', json: input }),
    onSuccess: (hasil) => {
      qc.setQueryData(flowchartKeys.detail(hasil.id), hasil)
      void qc.invalidateQueries({ queryKey: flowchartKeys.semua })
    },
  })
}

/** Sequence Diagram 3: pengajuan memakai endpoint validasi yang sama dengan data aplikasi. */
export function useAjukanFlowchart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<{ berhasil: number[]; dilewati: { id: number; nama: string; alasan: string }[] }>('/validasi', {
        method: 'POST',
        json: { jenisData: 'proses', targetIds: [id] },
      }),
    // Berhasil maupun 409 (status sudah berubah): muat ulang agar tampilan akurat.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: flowchartKeys.semua })
      void qc.invalidateQueries({ queryKey: ['validasi'] })
    },
  })
}
