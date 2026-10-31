import { Link } from 'react-router'
import { useAuth } from '@/auth/useAuth'

// Buku Panduan butir C.m: copyright atas nama Pemerintah Kota Bogor dengan tahun pembangunan.
const TAHUN_PEMBANGUNAN = 2026

const tautan = 'flex min-h-11 items-center hover:text-white'

export function Footer() {
  const { user } = useAuth()
  return (
    <footer className="mt-12 bg-brand-900 text-brand-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/logo bogor.png"
              alt="Logo Pemerintah Kota Bogor"
              className="h-10 w-10"
            />
            <p className="text-lg font-bold text-white">SPBE Kota Bogor</p>
          </div>
          <p className="mt-2 text-sm">Portal Manajemen Pengetahuan dan Repositori Arsitektur SPBE.</p>
        </div>
        <nav aria-label="Tautan cepat" className="grid grid-cols-2 gap-x-2 text-sm">
          <Link to="/berita" className={tautan}>Berita</Link>
          <Link to="/dokumen" className={tautan}>Dokumen</Link>
          {user ? (
            <>
              <Link to="/sop" className={tautan}>SOP</Link>
              <Link to="/forum" className={tautan}>Forum</Link>
              <Link to="/pembelajaran" className={tautan}>Pembelajaran</Link>
            </>
          ) : (
            <Link to="/kritik-saran" className={tautan}>Kritik & Saran</Link>
          )}
          <Link to="/bantuan" className={tautan}>FAQ & Panduan</Link>
        </nav>
        <div className="text-sm">
          <p className="font-semibold text-white">Kontak</p>
          <p className="mt-2">Dinas Komunikasi dan Informatika Kota Bogor — Bidang APTIKA</p>
        </div>
      </div>
      <div className="border-t border-brand-800 py-4 text-center text-xs">
        © {TAHUN_PEMBANGUNAN} Pemerintah Kota Bogor. Hak cipta dilindungi.
      </div>
    </footer>
  )
}
