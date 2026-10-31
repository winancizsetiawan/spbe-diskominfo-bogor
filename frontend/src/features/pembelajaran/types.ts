export type Tingkat = 'dasar' | 'menengah' | 'lanjutan'
export type FilterTingkat = 'semua' | Tingkat
export type TipeMedia = 'video' | 'audio' | 'tautan'

export interface Sertifikat {
  /** Bukti penyelesaian internal bernomor; bukan sertifikat kompetensi dan tanpa poin SKP (K11). */
  nomor: string
  kursus: string
  diterbitkanPada: string
}

export interface Kursus {
  id: number
  judul: string
  deskripsi: string
  kategori: string
  tingkat: Tingkat
  durasiJam: number
  jumlahMateri: number
  materiSelesai: number
  persen: number
  adaSertifikat: boolean
}

export interface Materi {
  id: number
  judul: string
  tipe: TipeMedia
  url: string
  selesai: boolean
}

export interface KursusDetail extends Kursus {
  materi: Materi[]
  sertifikat: Sertifikat | null
}

export interface DaftarKursus {
  items: Kursus[]
  sertifikat: Sertifikat[]
}

export const TINGKAT_LABEL: Record<FilterTingkat, string> = {
  semua: 'Semua',
  dasar: 'Dasar',
  menengah: 'Menengah',
  lanjutan: 'Lanjutan',
}

export const TIPE_MEDIA_LABEL: Record<TipeMedia, string> = { video: 'Video', audio: 'Audio', tautan: 'Tautan' }
