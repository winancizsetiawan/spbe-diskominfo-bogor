import type { Paged } from '@/api/client'
import type { StatusValidasi } from '@/features/katalog/types'

export type KategoriProses = 'utama' | 'pendukung' | 'manajemen'

/** As-Is = kondisi berjalan, To-Be = target perbaikan (Revisi bagian 6, fitur 4). */
export type JenisProses = 'as_is' | 'to_be'

export interface RiwayatVersi {
  versi: string
  catatan: string
  oleh: string
  tanggal: string
}

export interface Flowchart {
  id: number
  /** Dibuat server, mis. FB-01-PRZ. */
  kode: string
  nama: string
  deskripsi: string
  kategori: KategoriProses
  jenis: JenisProses
  versi: string
  pic: string
  instansi: { id: number; nama: string }
  /** `disetujui` ditampilkan sebagai "Dipublikasikan" (K6). */
  status: StatusValidasi
  catatanValidasi: string | null
  diperbaruiPada: string
  aplikasi: { id: number; nama: string }[]
  sop: { id: number; judul: string }[]
}

export interface FlowchartDetail extends Flowchart {
  bpmnXml: string
  riwayat: RiwayatVersi[]
}

export interface HitunganFlowchart {
  total: number
  dipublikasikan: number
  menunggu: number
  /** Draft dan Perlu Revisi: masih dikerjakan operator. */
  draft: number
  perKategori: Record<'semua' | KategoriProses, number>
}

export interface DaftarFlowchart extends Paged<Flowchart> {
  hitungan: HitunganFlowchart
}

export interface FlowchartFilter {
  page: number
  q?: string
  kategori?: KategoriProses
  status?: StatusValidasi
}

export interface FlowchartInput {
  nama: string
  deskripsi: string
  kategori: KategoriProses
  jenis: JenisProses
  pic: string
  idAplikasi: number[]
  idSop: number[]
  bpmnXml: string
  /** Hanya saat mengubah; masuk ke riwayat revisi. */
  catatanRevisi?: string
}

export interface OpsiFlowchart {
  aplikasi: { id: number; nama: string }[]
  sop: { id: number; judul: string }[]
}

export const KATEGORI_LABEL: Record<KategoriProses, string> = {
  utama: 'Proses Utama',
  pendukung: 'Proses Pendukung',
  manajemen: 'Proses Manajemen',
}

export const JENIS_LABEL: Record<JenisProses, string> = {
  as_is: 'As-Is (kondisi saat ini)',
  to_be: 'To-Be (target)',
}

export const BATAS_FLOWCHART = {
  namaMin: 5,
  namaMax: 100,
  picMin: 2,
  picMax: 100,
  deskripsiMax: 300,
  catatanMax: 300,
  /** Buku Panduan dan PRD: maksimal 10 MB per berkas. */
  maksBytes: 10 * 1024 * 1024,
} as const

/** Judul dan pemicu tombol disesuaikan dengan K6: setelah disetujui, berkas "Dipublikasikan". */
export const STATUS_FLOWCHART_LABEL: Record<StatusValidasi, string> = {
  draft: 'Draft',
  menunggu: 'Menunggu Validasi',
  disetujui: 'Dipublikasikan',
  perlu_revisi: 'Perlu Revisi',
  ditolak: 'Ditolak',
}

export const BISA_DIAJUKAN_FLOWCHART: StatusValidasi[] = ['draft', 'perlu_revisi']

/** Diagram minimal harus punya satu peristiwa awal dan satu peristiwa akhir. */
export interface HasilXml {
  xml: string
  adaMulai: boolean
  adaAkhir: boolean
}

export function ukuranBytes(teks: string) {
  return new TextEncoder().encode(teks).length
}
