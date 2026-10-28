import type { Paged } from '@/api/client'

export type KategoriNotifikasi = 'sistem' | 'forum' | 'pembelajaran' | 'dokumen'

export interface Notifikasi {
  id: number
  kategori: KategoriNotifikasi
  judul: string
  pesan: string
  /** Halaman tujuan di portal; hanya path internal. */
  urlTujuan: string
  sudahDibaca: boolean
  dibuatPada: string
}

export type FilterKategori = 'semua' | KategoriNotifikasi

export interface DaftarNotifikasi extends Paged<Notifikasi> {
  /** Jumlah belum dibaca per kategori, tidak terpengaruh filter. */
  belumDibaca: Record<FilterKategori, number>
}

export interface NotifikasiFilter {
  page: number
  kategori: FilterKategori
}

export const KATEGORI_LABEL: Record<FilterKategori, string> = {
  semua: 'Semua',
  sistem: 'Sistem',
  forum: 'Forum',
  pembelajaran: 'Pembelajaran',
  dokumen: 'Dokumen',
}

export const URUTAN_KATEGORI: FilterKategori[] = ['semua', 'sistem', 'forum', 'pembelajaran', 'dokumen']
