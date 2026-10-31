import type { Permission } from '@/auth/permissions'

export interface NavItem {
  label: string
  to: string
  /** Menu "Kelola": tampil hanya bila role punya izin ini. */
  perm?: Permission
}

export const PUBLIC_NAV: NavItem[] = [
  { label: 'Beranda', to: '/' },
  { label: 'Berita', to: '/berita' },
  { label: 'Dokumen', to: '/dokumen' },
  { label: 'Kritik & Saran', to: '/kritik-saran' },
  { label: 'Bantuan', to: '/bantuan' },
]

export const INTERNAL_NAV: NavItem[] = [
  { label: 'Beranda', to: '/beranda' },
  { label: 'Dokumen', to: '/dokumen' },
  { label: 'SOP', to: '/sop' },
  { label: 'Pembelajaran', to: '/pembelajaran' },
  { label: 'Forum', to: '/forum' },
  { label: 'Dasbor', to: '/dasbor/analitik' },
]

// Admin OPD melihat item katalog untuk instansinya; Super Admin melihat semuanya.
export const KELOLA_NAV: NavItem[] = [
  { label: 'Data Aplikasi', to: '/katalog/aplikasi', perm: 'aplikasi:kelola' },
  { label: 'Klasifikasi RAA', to: '/katalog/raa', perm: 'aplikasi:kelola' },
  { label: 'Flowchart Proses Bisnis', to: '/katalog/flowchart', perm: 'aplikasi:kelola' },
  { label: 'Dasbor Instansi', to: '/katalog/dasbor', perm: 'dasbor:instansi' },
  { label: 'Manajemen Pengguna', to: '/admin/pengguna', perm: 'pengguna:kelola' },
  { label: 'Validasi Data', to: '/admin/validasi', perm: 'validasi:putuskan' },
  { label: 'Repositori & Artikel', to: '/admin/repositori', perm: 'repositori:kelola' },
  { label: 'Moderasi Forum', to: '/admin/moderasi', perm: 'moderasi' },
  { label: 'Periode Pembaruan', to: '/admin/periode', perm: 'periode:kelola' },
  { label: 'Audit Trail', to: '/admin/audit', perm: 'audit:lihat' },
  { label: 'Backup', to: '/admin/backup', perm: 'backup:kelola' },
  { label: 'Kritik & Saran', to: '/admin/kritik', perm: 'kritik:lihat' },
]
