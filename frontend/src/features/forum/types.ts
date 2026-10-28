export interface KategoriForum {
  id: number
  nama: string
}

export interface Penulis {
  nama: string
  instansi: string
}

export type StatusThread = 'aktif' | 'terkunci' | 'tersembunyi'

export interface ThreadRingkas {
  id: number
  judul: string
  kategori: KategoriForum
  penulis: Penulis
  dibuatPada: string
  jumlahBalasan: number
  dilihat: number
  status: StatusThread
}

export interface Balasan {
  id: number
  konten: string
  penulis: Penulis
  dibuatPada: string
  jumlahNilai: number
  sudahDinilai: boolean
}

export interface ThreadDetail extends ThreadRingkas {
  konten: string
  balasan: Balasan[]
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
} as const
