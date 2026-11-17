export interface KategoriForum {
  id: number
  nama: string
}

export interface Penulis {
  nama: string
  instansi: string
}

export type StatusThread = 'aktif' | 'terkunci' | 'tersembunyi'

/** Pengguna yang dapat ditugaskan menjawab thread. */
export interface PenggunaForum {
  id: number
  nama: string
  instansi: string
}

/** Gambar atau PDF pada thread/balasan. `url` bertanda dan berlaku sementara. */
export interface Lampiran {
  id: string
  nama: string
  tipe: string
  ukuran: number
  url: string
}

export interface ThreadRingkas {
  id: number
  judul: string
  kategori: KategoriForum
  penulis: Penulis
  dibuatPada: string
  jumlahBalasan: number
  dilihat: number
  status: StatusThread
  /** Kosong: terbuka untuk semua. Berisi: hanya penerima dan pembuat yang dapat membalas. */
  penerima: PenggunaForum[]
}

export interface Balasan {
  id: number
  konten: string
  penulis: Penulis
  dibuatPada: string
  jumlahNilai: number
  sudahDinilai: boolean
  lampiran: Lampiran[]
}

export interface ThreadDetail extends ThreadRingkas {
  konten: string
  lampiran: Lampiran[]
  balasan: Balasan[]
  /** false: thread ditujukan ke orang lain, pengguna ini hanya dapat membaca. */
  bisaMembalas: boolean
  /** Pembuat thread dan Super Admin dapat mengubah penerima. */
  bisaMenugaskan: boolean
}

export interface ThreadFilter {
  page: number
  kategori?: number
  q?: string
}

export interface BuatThreadInput {
  idKategori: number
  judul: string
  konten: string
  penerima: number[]
  lampiran: string[]
}

export interface BalasInput {
  konten: string
  lampiran: string[]
}

export interface LaporanInput {
  targetTipe: 'thread' | 'balasan'
  targetId: number
  alasan: string
}

/** Batas isian; dipakai validasi klien dan mock API. Server tetap memvalidasi ulang. */
export const BATAS = {
  judulMin: 10,
  judulMax: 150,
  kontenMin: 20,
  kontenMax: 5000,
  balasanMax: 3000,
  alasanMin: 10,
  alasanMax: 500,
  penerimaMax: 5,
  lampiranMax: 5,
  lampiranBytes: 5 * 1024 * 1024,
} as const

/** Tipe lampiran yang diterima server (diperiksa ulang dari isi berkas). */
export const TIPE_LAMPIRAN = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const

export const adalahGambar = (tipe: string) => tipe.startsWith('image/')
