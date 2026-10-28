import type { Penulis } from '@/features/forum/types'

export type TabModerasi = 'semua' | 'dilaporkan' | 'selesai'

export type TargetTipe = 'thread' | 'balasan'

export type Tindakan = 'abaikan' | 'kunci' | 'sembunyikan'

/** Balasan hanya aktif atau tersembunyi; thread juga dapat terkunci. */
export type StatusItem = 'aktif' | 'terkunci' | 'tersembunyi'

export type StatusLaporan = 'baru' | 'ditindak' | 'ditolak'

export interface LaporanItem {
  id: number
  pelapor: string
  alasan: string
  dibuatPada: string
  status: StatusLaporan
}

/** Satu thread atau balasan beserta seluruh laporan terhadapnya. */
export interface ItemModerasi {
  targetTipe: TargetTipe
  targetId: number
  threadId: number
  judulThread: string
  kategori: string
  konten: string
  penulis: Penulis
  dibuatPada: string
  status: StatusItem
  /** Laporan belum ditinjau lebih dulu, lalu yang terbaru. */
  laporan: LaporanItem[]
  laporanBaru: number
}

export interface HitunganModerasi {
  semua: number
  dilaporkan: number
  selesai: number
}

export interface DaftarModerasi {
  items: ItemModerasi[]
  page: number
  totalPages: number
  total: number
  hitungan: HitunganModerasi
}

export interface ModerasiFilter {
  page: number
  q?: string
  tab: TabModerasi
}

export interface TindakanInput {
  targetTipe: TargetTipe
  targetId: number
  tindakan: Tindakan
  /** Wajib untuk kunci dan sembunyikan; dikirim ke pembuat konten sebagai notifikasi. */
  alasan?: string
}

export const BATAS_TINDAKAN = { alasanMin: 10, alasanMax: 500 } as const

export const TINDAKAN_INFO: Record<
  Tindakan,
  { judul: string; tombol: string; keterangan: string; wajibAlasan: boolean }
> = {
  abaikan: {
    judul: 'Abaikan laporan',
    tombol: 'Abaikan laporan',
    keterangan: 'Konten tetap tayang. Laporan ditandai Ditolak dan item pindah ke tab Selesai.',
    wajibAlasan: false,
  },
  kunci: {
    judul: 'Kunci thread',
    tombol: 'Kunci thread',
    keterangan: 'Thread tetap terbaca tetapi tidak dapat dibalas, dinilai, atau dilaporkan lagi.',
    wajibAlasan: true,
  },
  sembunyikan: {
    judul: 'Sembunyikan konten',
    tombol: 'Sembunyikan',
    keterangan: 'Konten tidak tampil lagi bagi pengguna. Tindakan ini tidak dapat dibatalkan dari halaman ini.',
    wajibAlasan: true,
  },
}

export const TAB_LABEL: Record<TabModerasi, string> = {
  semua: 'Semua',
  dilaporkan: 'Dilaporkan',
  selesai: 'Selesai',
}
