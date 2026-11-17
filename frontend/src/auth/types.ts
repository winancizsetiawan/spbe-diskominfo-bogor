export type Role = 'asn' | 'akademisi' | 'verifikator' | 'admin_opd' | 'super_admin'

export type StatusAkun = 'diundang' | 'aktif' | 'nonaktif'

export interface User {
  id: number
  nama: string
  email: string
  role: Role
  daftarPeran?: Role[]
  statusAkun: StatusAkun
  instansi: { id: number; nama: string }
  sandiDiubahPada?: string | null
  wajibGantiSandi?: boolean
  sisaHariSandi?: number
}

export const ROLE_LABEL: Record<Role, string> = {
  asn: 'ASN',
  akademisi: 'Akademisi',
  verifikator: 'Verifikator',
  admin_opd: 'Admin OPD',
  super_admin: 'Super Admin',
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  asn: 'bg-brand-100 text-brand-800 border-brand-200',
  akademisi: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  verifikator: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  admin_opd: 'bg-sky-100 text-sky-800 border-sky-200',
  super_admin: 'bg-amber-100 text-amber-900 border-amber-200',
}

export const ROLE_MODE_DESKRIPSI: Record<Role, string> = {
  asn: 'Mode Kerja ASN — Akses SOP internal pemerintahan, pembelajaran kompetensi, dan kolaborasi antar-OPD.',
  akademisi: 'Mode Kerja Akademisi — Akses literatur regulasi SPBE, analitik arsitektur daerah, dan diskusi kajian ilmiah.',
  verifikator: 'Mode Kerja Verifikator — Pemeriksaan dan persetujuan publikasi berita serta artikel edukasi SPBE.',
  admin_opd: 'Mode Kerja Admin OPD — Pengelolaan katalog aplikasi, klasifikasi RAA, dan proses bisnis instansi.',
  super_admin: 'Mode Kerja Super Admin — Pengelolaan penuh portal, validasi data OPD, repositori, dan keamanan sistem.',
}

export function daftarPeranPengguna(user: User | null): Role[] {
  if (!user) return []
  if (user.daftarPeran && user.daftarPeran.length > 0) return user.daftarPeran
  if (user.id === 1) return ['asn', 'akademisi', 'verifikator']
  if (user.role === 'asn') return ['asn', 'akademisi']
  return [user.role]
}
