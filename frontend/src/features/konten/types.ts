export type JenisArtikel = 'artikel' | 'berita'
export type FilterJenis = 'semua' | JenisArtikel

/** Bentuk isi tulisan, mengikuti formulir "Tambah Pengetahuan" di SIMPAN BRIN. */
export type FormatArtikel = 'gambar' | 'video' | 'audio' | 'teks'
/** Publik dibaca siapa saja; internal hanya oleh yang sudah masuk. */
export type AksesArtikel = 'publik' | 'internal'
export type StatusVerifikasiArtikel = 'terbit' | 'menunggu' | 'revisi'

export interface Artikel {
  id: number
  jenis: JenisArtikel
  judul: string
  ringkasan: string
  penulis: string
  tanggal: string
  views: number
  format: FormatArtikel
  kategori: string
  label: string[]
  unggulan: boolean
  statusVerifikasi?: StatusVerifikasiArtikel
  catatanVerifikasi?: string | null
}

/** Isi berupa teks polos; paragraf dipisah baris kosong dan dirender sebagai teks (bukan HTML). */
export interface ArtikelDetail extends Artikel {
  konten: string
  /** Tautan ke sumber (gambar, video, audio, atau teks asli); kosong bila tidak ada. */
  urlSumber: string
  kolaborator: string[]
  statusAkses: AksesArtikel
  diverifikasiOleh?: string | null
  diverifikasiPada?: string | null
}

export interface DaftarVerifikasiArtikel {
  ringkasan: {
    menunggu: number
    terbit: number
    revisi: number
  }
  items: ArtikelDetail[]
}

export const STATUS_VERIFIKASI_ARTIKEL_LABEL: Record<
  StatusVerifikasiArtikel,
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  terbit: { label: 'Diterbitkan', tone: 'success' },
  menunggu: { label: 'Menunggu Verifikasi', tone: 'warning' },
  revisi: { label: 'Perlu Revisi', tone: 'danger' },
}

export interface ArtikelInput {
  jenis: JenisArtikel
  judul: string
  format: FormatArtikel
  urlSumber: string
  penulis: string[]
  kolaborator: string[]
  ringkasan: string
  konten: string
  kategori: string
  label: string[]
  /** YYYY-MM-DD; kosong berarti hari ini. */
  tanggalTerbit: string
  statusAkses: AksesArtikel
  unggulan: boolean
}

export const BATAS_ARTIKEL = {
  judulMin: 5,
  judulMax: 200,
  ringkasanMin: 10,
  ringkasanMax: 500,
  kontenMin: 20,
  penulisMaks: 5,
  kolaboratorMaks: 10,
  labelMaks: 10,
  namaMaks: 100,
  labelPanjangMaks: 40,
} as const

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

export const FORMAT_LABEL: Record<FormatArtikel, string> = { gambar: 'Gambar', video: 'Video', audio: 'Audio', teks: 'Teks' }
export const URL_LABEL: Record<FormatArtikel, string> = { gambar: 'Tautan gambar', video: 'Tautan video', audio: 'Tautan audio', teks: 'Tautan teks' }
export const AKSES_LABEL: Record<AksesArtikel, string> = { publik: 'Publik (semua orang)', internal: 'Internal (setelah masuk)' }

/** Daftar sementara; ganti dengan kategori master bila sudah ada sumbernya. Server menerima teks 2 sampai 80 karakter. */
export const KATEGORI_ARTIKEL = ['Kebijakan Arsitektur Digital', 'Arsitektur Digital', 'Keamanan Informasi', 'Layanan Digital', 'Pelatihan dan Kegiatan', 'Umum'] as const
