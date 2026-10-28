import type { Role, StatusAkun } from '@/auth/types'
import type { InstansiPengguna } from '@/features/pengguna/types'
import { USERS } from './db'

// Daftar instansi untuk manajemen pengguna. Id 1, 2, 10 sama dengan instansi akun demo di db.ts.
export const INSTANSI_SEMUA: InstansiPengguna[] = [
  { id: 1, nama: 'Diskominfo Kota Bogor', jenis: 'OPD' },
  { id: 2, nama: 'Dinas Kesehatan Kota Bogor', jenis: 'OPD' },
  { id: 3, nama: 'Bapenda Kota Bogor', jenis: 'OPD' },
  { id: 4, nama: 'Bappeda Kota Bogor', jenis: 'OPD' },
  { id: 5, nama: 'Kecamatan Bogor Tengah', jenis: 'OPD' },
  { id: 6, nama: 'Dinas Pendidikan Kota Bogor', jenis: 'OPD' },
  { id: 10, nama: 'Perguruan Tinggi Mitra', jenis: 'Perguruan Tinggi' },
  { id: 11, nama: 'Pemprov Jawa Barat', jenis: 'Pemprov' },
  { id: 12, nama: 'Kementerian PANRB', jenis: 'Kementerian' },
]

export interface PenggunaRow {
  id: number
  nama: string
  email: string
  role: Role
  statusAkun: StatusAkun
  idInstansi: number
  loginTerakhir: string | null
}

const jamLalu = (jam: number) => new Date(Date.now() - jam * 3_600_000).toISOString()

// Empat akun demo diambil dari USERS agar perubahan di sini tercermin di sesi login demo.
const LOGIN_DEMO: Record<number, number> = { 1: 1, 2: 4, 3: 2, 4: 1 }
const akunDemo: PenggunaRow[] = Object.values(USERS).map((u) => ({
  id: u.id,
  nama: u.nama,
  email: u.email,
  role: u.role,
  statusAkun: u.statusAkun,
  idInstansi: u.instansi.id,
  loginTerakhir: jamLalu(LOGIN_DEMO[u.id] ?? 24),
}))

export const pengguna: PenggunaRow[] = [
  ...akunDemo,
  { id: 5, nama: 'Budi Santoso', email: 'budi.santoso@example.go.id', role: 'asn', statusAkun: 'aktif', idInstansi: 4, loginTerakhir: jamLalu(72) },
  { id: 6, nama: 'Rina Oktaviani', email: 'rina.oktaviani@example.go.id', role: 'admin_opd', statusAkun: 'aktif', idInstansi: 2, loginTerakhir: jamLalu(5) },
  { id: 7, nama: 'Dewi Lestari', email: 'dewi.lestari@example.go.id', role: 'asn', statusAkun: 'aktif', idInstansi: 5, loginTerakhir: jamLalu(48) },
  { id: 8, nama: 'Ahmad Fauzi', email: 'ahmad.fauzi@example.go.id', role: 'asn', statusAkun: 'nonaktif', idInstansi: 6, loginTerakhir: jamLalu(900) },
  { id: 9, nama: 'Operator Diskominfo', email: 'operator.diskominfo@example.go.id', role: 'admin_opd', statusAkun: 'aktif', idInstansi: 1, loginTerakhir: jamLalu(10) },
  { id: 10, nama: 'Operator Bapenda', email: 'operator.bapenda@example.go.id', role: 'admin_opd', statusAkun: 'aktif', idInstansi: 3, loginTerakhir: jamLalu(30) },
  { id: 11, nama: 'Prof. Hendra Wijaya', email: 'hendra.wijaya@example.ac.id', role: 'akademisi', statusAkun: 'diundang', idInstansi: 10, loginTerakhir: null },
  { id: 12, nama: 'Maya Anggraini', email: 'maya.anggraini@example.go.id', role: 'asn', statusAkun: 'diundang', idInstansi: 6, loginTerakhir: null },
  { id: 13, nama: 'Lukman Hakim', email: 'lukman.hakim@example.go.id', role: 'super_admin', statusAkun: 'aktif', idInstansi: 1, loginTerakhir: jamLalu(8) },
]

let seq = Math.max(...pengguna.map((p) => p.id))
export const nextPenggunaId = () => ++seq

/** Salin perubahan ke USERS agar sesi login demo (dan /api/me) ikut berubah. */
export function sinkronkanAkunDemo(row: PenggunaRow) {
  const akun = Object.values(USERS).find((u) => u.id === row.id)
  if (!akun) return
  const instansi = INSTANSI_SEMUA.find((i) => i.id === row.idInstansi)!
  akun.role = row.role
  akun.statusAkun = row.statusAkun
  akun.instansi = { id: instansi.id, nama: instansi.nama }
}
