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
  /** "tnd": ASN masuk dengan NIP dan kata sandi TND; kata sandinya tidak dapat diganti dari portal. */
  sumberAkun?: 'lokal' | 'tnd'
}

/** Jawaban POST /api/auth/login dan /api/auth/switch-role. Mode mock (MSW) tidak mengirim token. */
export interface JawabanLogin {
  role: Role
  user: User
  token?: string
  kedaluwarsaPada?: string
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
  asn: 'Akses dokumen dan SOP internal, pembelajaran SPBE, forum diskusi antar-OPD, dan Dasbor Analitik.',
  akademisi: 'Akses dokumen dan regulasi SPBE, Dasbor Analitik arsitektur Kota Bogor, pembelajaran, dan forum diskusi.',
  verifikator: 'Peran tambahan ASN dari Super Admin: memeriksa dan menyetujui berita serta artikel SPBE sebelum terbit.',
  admin_opd: 'Mengelola data aplikasi, klasifikasi RAA, flowchart proses bisnis, dan dasbor instansi Anda.',
  super_admin: 'Mengelola seluruh portal: pengguna, validasi data OPD, repositori, moderasi forum, data dasbor, dan backup.',
}

export function daftarPeranPengguna(user: User | null): Role[] {
  if (!user) return []
  if (user.daftarPeran && user.daftarPeran.length > 0) return user.daftarPeran
  if (user.role === 'asn') return ['asn', 'akademisi']
  return [user.role]
}
