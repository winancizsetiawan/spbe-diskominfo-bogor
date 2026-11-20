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

export interface SumberJawaban {
  tipe: TipeHasil
  id: number
  judul: string
  meta: string
  url: string
}

export interface JawabanSingkat {
  teks: string
  keyakinan: 'tinggi' | 'sedang'
  kataKunci?: string[]
  sumber: SumberJawaban[]
}

export interface DaftarCari {
  items: HasilCari[]
  page: number
  totalPages: number
  total: number
  hitungan: Record<FilterTipe, number>
  /** True bila Smart Search tidak sehat dan server memakai Full-Text Search (Revisi 5.9). */
  fallback: boolean
  /** Ringkasan jawaban singkat yang diekstrak murni dari data portal (bukan pengetahuan luar). */
  jawabanSingkat?: JawabanSingkat
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
  flowchart: 'Diagram Alur',
}

/** Jenis yang boleh dicari pengunjung tanpa login; sisanya hanya untuk pengguna internal. */
export const TIPE_PUBLIK: FilterTipe[] = ['semua', 'dokumen', 'berita', 'bantuan']

const KATA_HENTI = new Set([
  'apa', 'apakah', 'bagaimana', 'cara', 'siapa', 'dimana', 'kapan', 'mengapa', 'kenapa', 'berapa',
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'adalah', 'dengan', 'atau', 'ini', 'itu',
  'saja', 'bisa', 'dapat', 'dalam', 'tentang', 'terkait', 'oleh', 'jika', 'bila', 'sudah', 'belum',
])

/** Kata kunci unik dari kueri, dipakai untuk menandai hasil. Kata terlalu pendek atau kata tanya umum diabaikan. */
export function kataKunci(q: string) {
  const semua = [...new Set(q.toLowerCase().split(/\s+/).filter((k) => k.length >= 2))]
  const bermakna = semua.filter((k) => !KATA_HENTI.has(k))
  return bermakna.length > 0 ? bermakna : semua
}

/** Kueri contoh untuk pengunjung; mengarah ke pencarian pintar. */
export const PENCARIAN_POPULER = ['Arsitektur Pemerintah Digital', 'Peraturan Arsitektur Pemerintah Digital', 'Keamanan informasi', 'Cadangan data', 'Integrasi layanan']
