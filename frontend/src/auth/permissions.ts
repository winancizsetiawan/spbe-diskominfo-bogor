import type { Role, User } from './types'

// Matriks hak akses (Revisi_Fondasi_dan_Fitur.md bagian 3). Satu-satunya tempat
// aturan role didefinisikan di frontend; API tetap sumber otoritatif.
export type Permission =
  | 'konten:internal' // SOP, dokumen internal, MOOC, forum, notifikasi, profil, dasbor lanjutan
  | 'aplikasi:kelola' // Admin OPD: instansi sendiri; Super Admin: semua
  | 'dasbor:instansi'
  | 'validasi:ajukan'
  | 'validasi:putuskan'
  | 'repositori:kelola'
  | 'moderasi'
  | 'pengguna:kelola'
  | 'periode:kelola'
  | 'audit:lihat'
  | 'backup:kelola'
  | 'kritik:lihat'

const SEMUA_INTERNAL: Role[] = ['asn', 'akademisi', 'admin_opd', 'super_admin']
const PENGELOLA: Role[] = ['admin_opd', 'super_admin']
const SUPER: Role[] = ['super_admin']

const ALLOWED: Record<Permission, Role[]> = {
  'konten:internal': SEMUA_INTERNAL,
  'aplikasi:kelola': PENGELOLA,
  'dasbor:instansi': PENGELOLA,
  'validasi:ajukan': ['admin_opd'],
  'validasi:putuskan': SUPER,
  'repositori:kelola': SUPER,
  moderasi: SUPER,
  'pengguna:kelola': SUPER,
  'periode:kelola': SUPER,
  'audit:lihat': SUPER,
  'backup:kelola': SUPER,
  'kritik:lihat': SUPER,
}

export function can(user: User | null, permission: Permission): boolean {
  return !!user && user.statusAkun === 'aktif' && ALLOWED[permission].includes(user.role)
}
