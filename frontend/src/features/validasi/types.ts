import type { Flowchart } from '@/features/flowchart/types'
import type { Aplikasi, Instansi, StatusValidasi } from '@/features/katalog/types'

/** Pengajuan tidak pernah berstatus Draft: Draft hanya ada di data aplikasinya. */
export type StatusPengajuan = Exclude<StatusValidasi, 'draft'>

export type Keputusan = 'disetujui' | 'perlu_revisi' | 'ditolak'

/** `proses` = flowchart proses bisnis (K8); aplikasi dan raa merujuk ke data aplikasi. */
export type JenisData = 'aplikasi' | 'raa' | 'proses'

export interface Pengajuan {
  id: number
  jenisData: JenisData
  status: StatusPengajuan
  aplikasi: { id: number; nama: string }
  instansi: Instansi
  pengaju: string
  tanggalPengajuan: string
  tanggalPutusan: string | null
  /** Catatan validator; wajib untuk Perlu Revisi dan Ditolak. */
  catatan: string | null
}

export interface PengajuanDetail extends Pengajuan {
  /** Terisi untuk jenis aplikasi dan raa. */
  data: Aplikasi | null
  /** Terisi untuk jenis proses (flowchart). */
  proses: Flowchart | null
}

export interface Hitungan {
  semua: number
  menunggu: number
  disetujui: number
  perlu_revisi: number
  ditolak: number
}

export interface DaftarPengajuan {
  items: Pengajuan[]
  page: number
  totalPages: number
  total: number
  hitungan: Hitungan
}

export interface PengajuanFilter {
  page: number
  q?: string
  /** undefined = semua status. */
  status?: StatusPengajuan
}

export const JENIS_DATA_LABEL: Record<JenisData, string> = {
  aplikasi: 'Data Aplikasi',
  raa: 'Klasifikasi RAA',
  proses: 'Flowchart Proses Bisnis',
}

export const BATAS_KEPUTUSAN = { catatanMin: 10, catatanMax: 500 } as const

export const KEPUTUSAN_INFO: Record<Keputusan, { label: string; keterangan: string; wajibCatatan: boolean }> = {
  disetujui: {
    label: 'Setujui',
    keterangan: 'Data masuk basis data terpusat dan tidak dapat diubah kecuali oleh Admin OPD (status kembali Draft).',
    wajibCatatan: false,
  },
  perlu_revisi: {
    label: 'Perlu revisi',
    keterangan: 'Dikembalikan ke Admin OPD untuk diperbaiki, lalu dapat diajukan ulang.',
    wajibCatatan: true,
  },
  ditolak: {
    label: 'Tolak',
    keterangan: 'Final. Data tidak diterima; Admin OPD perlu mengajukan ulang dari awal bila diperlukan.',
    wajibCatatan: true,
  },
}
