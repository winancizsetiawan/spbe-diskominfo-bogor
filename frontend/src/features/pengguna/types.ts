import type { Paged } from '@/api/client'
import type { Role, StatusAkun } from '@/auth/types'

export type JenisInstansi = 'OPD' | 'Pemprov' | 'Kementerian' | 'Perguruan Tinggi'

export interface InstansiPengguna {
  id: number
  nama: string
  jenis: JenisInstansi
}

export interface Pengguna {
  id: number
  nama: string
  email: string
  role: Role
  daftarPeran?: Role[]
  statusAkun: StatusAkun
  instansi: InstansiPengguna
  /** Kosong selama pengguna yang diundang belum pernah masuk. */
  loginTerakhir: string | null
}

export type FilterRole = 'semua' | Role

export interface DaftarPengguna extends Paged<Pengguna> {
  /** Jumlah per role, tidak terpengaruh pencarian. */
  hitungan: Record<FilterRole, number>
}

export interface PenggunaFilter {
  page: number
  q?: string
  role: FilterRole
}

export interface UndangInput {
  nama: string
  email: string
  role: Role
  idInstansi: number
}

/** `aktif` berarti "aktifkan kembali"; server memilih diundang atau aktif sesuai riwayat login. */
export interface UbahPenggunaInput {
  role?: Role
  daftarPeran?: Role[]
  idInstansi?: number
  statusAkun?: 'aktif' | 'nonaktif'
}

/** Urutan tab filter daftar pengguna. Tab Verifikator berisi ASN yang diberi hak Verifikator. */
export const URUTAN_ROLE: Role[] = ['asn', 'akademisi', 'verifikator', 'admin_opd', 'super_admin']

/** Peran utama yang dapat dipilih. Verifikator bukan peran utama: hanya tambahan untuk ASN. */
export const PERAN_UTAMA: Role[] = ['asn', 'akademisi', 'admin_opd', 'super_admin']

/** Peran aktif "verifikator" adalah ASN yang sedang beralih peran; peran utamanya tetap ASN. */
export const peranUtamaDari = (r: Role): Role => (r === 'verifikator' ? 'asn' : r)

export const BATAS_PENGGUNA = { namaMin: 3, namaMax: 100 } as const

export const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const STATUS_AKUN_LABEL: Record<StatusAkun, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  diundang: { label: 'Diundang', tone: 'warning' },
  aktif: { label: 'Aktif', tone: 'success' },
  nonaktif: { label: 'Nonaktif', tone: 'danger' },
}

/** Admin OPD mengelola data instansinya sendiri, jadi instansinya harus OPD (K9). */
export function instansiBolehUntuk(role: Role, instansi: InstansiPengguna) {
  return role !== 'admin_opd' || instansi.jenis === 'OPD'
}
