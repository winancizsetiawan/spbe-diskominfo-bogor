export type JenisArtikel = 'artikel' | 'berita'
export type FilterJenis = 'semua' | JenisArtikel

export interface Artikel {
  id: number
  jenis: JenisArtikel
  judul: string
  ringkasan: string
  penulis: string
  tanggal: string
  views: number
}

/** Isi berupa teks polos; paragraf dipisah baris kosong dan dirender sebagai teks (bukan HTML). */
export interface ArtikelDetail extends Artikel {
  konten: string
}

export interface DaftarArtikel {
  items: Artikel[]
  page: number
  totalPages: number
  total: number
}

export interface Faq {
  id: number
  pertanyaan: string
  jawaban: string
}

export interface Bantuan {
  faq: Faq[]
  panduan: { id: number; judul: string; isi: string }[]
  video: { id: number; judul: string; url: string }[]
}

export const JENIS_LABEL: Record<FilterJenis, string> = { semua: 'Semua', berita: 'Berita', artikel: 'Artikel' }
