import { Link } from 'react-router'

// Buku Panduan butir C.m: copyright atas nama Pemerintah Kota Bogor dengan tahun pembangunan.
const TAHUN_PEMBANGUNAN = 2026

export function Footer() {
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
          <Link to="/berita" className="block py-1.5 hover:text-white">Berita</Link>
          <Link to="/dokumen" className="block py-1.5 hover:text-white">Dokumen</Link>
          <Link to="/sop" className="block py-1.5 hover:text-white">SOP</Link>
          <Link to="/forum" className="block py-1.5 hover:text-white">Forum</Link>
          <Link to="/pembelajaran" className="block py-1.5 hover:text-white">Pembelajaran</Link>
          <Link to="/bantuan" className="block py-1.5 hover:text-white">FAQ & Panduan</Link>
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
