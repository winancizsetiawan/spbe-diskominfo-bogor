export type StatusValidasi = 'draft' | 'menunggu' | 'disetujui' | 'perlu_revisi' | 'ditolak'

export type StatusRaa = 'sesuai' | 'perlu_penyesuaian' | 'belum'

export interface KodeRaa {
  level1: string | null
  level2: string | null
  level3: string | null
}

export interface Instansi {
  id: number
  nama: string
}

export interface Aplikasi {
  id: number
  nama: string
  deskripsi: string
  kategori: string | null
  raa: KodeRaa
  instansi: Instansi
  statusValidasi: StatusValidasi
  statusRaa: StatusRaa
  nilaiKesesuaian: number
  /** Catatan validator bila Perlu Revisi atau Ditolak. */
  catatanValidasi: string | null
  diperbaruiPada: string
}

export interface AplikasiInput {
  nama: string
  deskripsi: string
  kategori: string | null
  raa: KodeRaa
  /** Hanya Super Admin saat menambah; Admin OPD selalu instansinya sendiri. */
  idInstansi?: number
}

export interface RingkasanAplikasi {
  total: number
  sesuai: number
  perluPenyesuaian: number
  belum: number
}

export interface AplikasiFilter {
  page: number
  q?: string
  statusValidasi?: StatusValidasi
  statusRaa?: StatusRaa
}

export interface NodeRaa {
  kode: string
  nama: string
  anak?: NodeRaa[]
}

export interface HasilAjukan {
  berhasil: number[]
  dilewati: { id: number; nama: string; alasan: string }[]
}

export const KATEGORI_APLIKASI = ['Manajemen', 'Pelayanan Publik', 'Keuangan', 'Kepegawaian', 'Lainnya'] as const

export const BATAS_APLIKASI = { namaMin: 3, namaMax: 100, deskripsiMax: 500 } as const

/** Status yang boleh diajukan ke validasi (K6). */
export const BISA_DIAJUKAN: StatusValidasi[] = ['draft', 'perlu_revisi']

/**
 * Nilai kesesuaian dihitung otomatis dari kelengkapan isian dan klasifikasi RAA
 * Level 1-3 (keputusan pertanyaan 1). Server tetap sumber kebenaran; di FE hanya pratinjau.
 */
export function hitungKesesuaian(a: Pick<AplikasiInput, 'nama' | 'deskripsi' | 'kategori' | 'raa'>) {
  const isian = [a.nama, a.deskripsi, a.kategori, a.raa.level1, a.raa.level2, a.raa.level3]
  const terisi = isian.filter((v) => !!v && v.trim().length > 0).length
  return Math.round((terisi / isian.length) * 100)
}

/** Ambang K14: ≥ 80 Sesuai, 50–79 Perlu Penyesuaian, < 50 Belum. */
export function statusRaaDari(nilai: number): StatusRaa {
  if (nilai >= 80) return 'sesuai'
  if (nilai >= 50) return 'perlu_penyesuaian'
  return 'belum'
}

/** Kode terdalam yang terisi beserta namanya, mis. "1.1.2 Rujukan dan Rumah Sakit". */
export function labelRaa(raa: KodeRaa, pohon: NodeRaa[] | undefined) {
  const kode = raa.level3 ?? raa.level2 ?? raa.level1
  if (!kode) return null
  const node = cariNodeRaa(pohon, kode)
  return node ? `${node.kode} ${node.nama}` : kode
}

export function cariNodeRaa(pohon: NodeRaa[] | undefined, kode: string | null): NodeRaa | undefined {
  if (!pohon || !kode) return undefined
  for (const node of pohon) {
    if (node.kode === kode) return node
    const ketemu = cariNodeRaa(node.anak, kode)
    if (ketemu) return ketemu
  }
  return undefined
}
