import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { RequireAuth, RequirePermission } from '@/auth/guards'
import type { Permission } from '@/auth/permissions'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { halaman } from './halaman'

// Setiap halaman fitur menjadi chunk sendiri dan baru diunduh saat pertama dibuka.
// Layout, guard, dan halaman 404/403 tetap dimuat di awal karena dipakai setiap navigasi.
const LandingPage = halaman(() => import('@/features/publik/LandingPage'), 'LandingPage')
const LoginPage = halaman(() => import('@/features/auth/LoginPage'), 'LoginPage')
const AccountInactivePage = halaman(() => import('@/features/auth/AccountInactivePage'), 'AccountInactivePage')
const BerandaPage = halaman(() => import('@/features/beranda/BerandaPage'), 'BerandaPage')
const DokumenListPage = halaman(() => import('@/features/dokumen/pages/DokumenListPage'), 'DokumenListPage')
const DokumenDetailPage = halaman(() => import('@/features/dokumen/pages/DokumenDetailPage'), 'DokumenDetailPage')
const ForumListPage = halaman(() => import('@/features/forum/pages/ForumListPage'), 'ForumListPage')
const CreateThreadPage = halaman(() => import('@/features/forum/pages/CreateThreadPage'), 'CreateThreadPage')
const ThreadDetailPage = halaman(() => import('@/features/forum/pages/ThreadDetailPage'), 'ThreadDetailPage')
const AplikasiListPage = halaman(() => import('@/features/katalog/pages/AplikasiListPage'), 'AplikasiListPage')
const AplikasiFormPage = halaman(() => import('@/features/katalog/pages/AplikasiFormPage'), 'AplikasiFormPage')
const RaaPage = halaman(() => import('@/features/katalog/pages/RaaPage'), 'RaaPage')
const ValidasiListPage = halaman(() => import('@/features/validasi/pages/ValidasiListPage'), 'ValidasiListPage')
const ValidasiDetailPage = halaman(() => import('@/features/validasi/pages/ValidasiDetailPage'), 'ValidasiDetailPage')
const RepositoriListPage = halaman(() => import('@/features/repositori/pages/RepositoriListPage'), 'RepositoriListPage')
const UnggahDokumenPage = halaman(() => import('@/features/repositori/pages/UnggahDokumenPage'), 'UnggahDokumenPage')
const ModerasiPage = halaman(() => import('@/features/moderasi/pages/ModerasiPage'), 'ModerasiPage')
const NotifikasiPage = halaman(() => import('@/features/notifikasi/pages/NotifikasiPage'), 'NotifikasiPage')
const ProfilPage = halaman(() => import('@/features/profil/pages/ProfilPage'), 'ProfilPage')
const PenggunaPage = halaman(() => import('@/features/pengguna/pages/PenggunaPage'), 'PenggunaPage')
const DasborInstansiPage = halaman(() => import('@/features/dasbor/pages/DasborInstansiPage'), 'DasborInstansiPage')
const DasborAnalitikPage = halaman(() => import('@/features/dasbor/pages/DasborAnalitikPage'), 'DasborAnalitikPage')
const BeritaListPage = halaman(() => import('@/features/konten/pages/BeritaListPage'), 'BeritaListPage')
const BeritaDetailPage = halaman(() => import('@/features/konten/pages/BeritaDetailPage'), 'BeritaDetailPage')
const BantuanPage = halaman(() => import('@/features/konten/pages/BantuanPage'), 'BantuanPage')
const KursusListPage = halaman(() => import('@/features/pembelajaran/pages/KursusListPage'), 'KursusListPage')
const KursusDetailPage = halaman(() => import('@/features/pembelajaran/pages/KursusDetailPage'), 'KursusDetailPage')
const KritikPage = halaman(() => import('@/features/kritik/KritikPage'), 'KritikPage')
const KritikAdminPage = halaman(() => import('@/features/kritik/KritikAdminPage'), 'KritikAdminPage')
const CariPage = halaman(() => import('@/features/cari/pages/CariPage'), 'CariPage')
const AuditPage = halaman(() => import('@/features/sistem/pages/AuditPage'), 'AuditPage')
const BackupPage = halaman(() => import('@/features/sistem/pages/BackupPage'), 'BackupPage')
const PeriodePage = halaman(() => import('@/features/sistem/pages/PeriodePage'), 'PeriodePage')
const FlowchartListPage = halaman(() => import('@/features/flowchart/pages/FlowchartListPage'), 'FlowchartListPage')
const FlowchartDetailPage = halaman(() => import('@/features/flowchart/pages/FlowchartDetailPage'), 'FlowchartDetailPage')
const FlowchartFormPage = halaman(() => import('@/features/flowchart/pages/FlowchartFormPage'), 'FlowchartFormPage')

/** Sekelompok route yang hanya boleh dibuka role dengan izin tertentu. */
const guarded = (perm: Permission, children: { path: string; element: ReactNode }[]) => ({
  element: <RequirePermission perm={perm} />,
  children,
})

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // Publik (Pengguna Umum)
      { index: true, element: <LandingPage /> },
      { path: 'masuk', element: <LoginPage /> },
      { path: 'akun-tidak-aktif', element: <AccountInactivePage /> },
      { path: 'berita', element: <BeritaListPage /> },
      { path: 'berita/:id', element: <BeritaDetailPage /> },
      { path: 'kritik-saran', element: <KritikPage /> },
      { path: 'dokumen', element: <DokumenListPage kelompok="dokumen" /> },
      { path: 'dokumen/:id', element: <DokumenDetailPage /> },
      { path: 'bantuan', element: <BantuanPage /> },
      { path: 'cari', element: <CariPage /> },

      // Semua pengguna internal yang aktif (ASN, Akademisi, Admin OPD, Super Admin)
      {
        element: <RequireAuth />,
        children: [
          { path: 'beranda', element: <BerandaPage /> },
          { path: 'notifikasi', element: <NotifikasiPage /> },
          { path: 'profil', element: <ProfilPage /> },
          { path: 'sop', element: <DokumenListPage kelompok="sop" /> },
          { path: 'pembelajaran', element: <KursusListPage /> },
          { path: 'pembelajaran/:id', element: <KursusDetailPage /> },
          { path: 'dasbor/analitik', element: <DasborAnalitikPage /> },
          { path: 'forum', element: <ForumListPage /> },
          { path: 'forum/baru', element: <CreateThreadPage /> },
          { path: 'forum/:id', element: <ThreadDetailPage /> },

          // Admin OPD (instansi sendiri) dan Super Admin (semua instansi)
          guarded('aplikasi:kelola', [
            { path: 'katalog/aplikasi', element: <AplikasiListPage /> },
            { path: 'katalog/aplikasi/baru', element: <AplikasiFormPage /> },
            { path: 'katalog/aplikasi/:id/ubah', element: <AplikasiFormPage /> },
            { path: 'katalog/raa', element: <RaaPage /> },
            { path: 'katalog/flowchart', element: <FlowchartListPage /> },
            { path: 'katalog/flowchart/baru', element: <FlowchartFormPage /> },
            { path: 'katalog/flowchart/:id', element: <FlowchartDetailPage /> },
            { path: 'katalog/flowchart/:id/ubah', element: <FlowchartFormPage /> },
          ]),
          guarded('dasbor:instansi', [
            { path: 'katalog/dasbor', element: <DasborInstansiPage /> },
          ]),

          // Super Admin
          guarded('pengguna:kelola', [
            { path: 'admin/pengguna', element: <PenggunaPage /> },
          ]),
          guarded('validasi:putuskan', [
            { path: 'admin/validasi', element: <ValidasiListPage /> },
            { path: 'admin/validasi/:id', element: <ValidasiDetailPage /> },
          ]),
          guarded('repositori:kelola', [
            { path: 'admin/repositori', element: <RepositoriListPage /> },
            { path: 'admin/repositori/baru', element: <UnggahDokumenPage /> },
          ]),
          guarded('moderasi', [{ path: 'admin/moderasi', element: <ModerasiPage /> }]),
          guarded('kritik:lihat', [{ path: 'admin/kritik', element: <KritikAdminPage /> }]),
          guarded('periode:kelola', [{ path: 'admin/periode', element: <PeriodePage /> }]),
          guarded('audit:lihat', [{ path: 'admin/audit', element: <AuditPage /> }]),
          guarded('backup:kelola', [{ path: 'admin/backup', element: <BackupPage /> }]),
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
