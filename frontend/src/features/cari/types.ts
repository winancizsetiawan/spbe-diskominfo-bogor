export type TipeHasil = 'dokumen' | 'sop' | 'forum' | 'berita' | 'bantuan' | 'kursus' | 'aplikasi' | 'flowchart'
export type FilterTipe = 'semua' | TipeHasil

export interface HasilCari {
  tipe: TipeHasil
  id: number
  judul: string
  /** Teks polos; FE yang menandai kata kunci agar tidak ada HTML dari server. */
  cuplikan: string
  /** Keterangan singkat, mis. kategori, instansi, atau jumlah balasan. */
  meta: string
  url: string
}

export interface CariFilter {
  q: string
  tipe: FilterTipe
  page: number
}

export interface DaftarCari {
  items: HasilCari[]
  page: number
  totalPages: number
  total: number
  hitungan: Record<FilterTipe, number>
  /** True bila Smart Search tidak sehat dan server memakai Full-Text Search (Revisi 5.9). */
  fallback: boolean
}

export const BATAS_CARI = { min: 2, max: 200 }

export const TIPE_LABEL: Record<FilterTipe, string> = {
  semua: 'Semua',
  dokumen: 'Dokumen',
  sop: 'SOP',
  forum: 'Forum',
  berita: 'Berita & Artikel',
  bantuan: 'Bantuan',
  kursus: 'Kursus',
  aplikasi: 'Aplikasi',
  flowchart: 'Flowchart',
}

/** Jenis yang boleh dicari pengunjung tanpa login; sisanya hanya untuk pengguna internal. */
export const TIPE_PUBLIK: FilterTipe[] = ['semua', 'dokumen', 'berita', 'bantuan']

/** Kata kunci unik dari kueri, dipakai untuk menandai hasil. Kata terlalu pendek diabaikan. */
export function kataKunci(q: string) {
  return [...new Set(q.toLowerCase().split(/\s+/).filter((k) => k.length >= 2))]
}

/** Kueri contoh untuk pengunjung; mengarah ke pencarian pintar. */
export const PENCARIAN_POPULER = ['Arsitektur SPBE', 'Peraturan SPBE', 'Keamanan informasi', 'Backup data', 'Integrasi layanan']
