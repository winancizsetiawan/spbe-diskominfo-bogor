import { Link } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Hakcipta, KONTAK } from './Hakcipta'

// Judul kolom sama gaya dan sama posisi agar ketiga kolom sejajar di atas.
const judul = 'text-sm font-semibold text-white'

export function Footer() {
  const { user } = useAuth()
  const tautan = [
    { label: 'Berita', to: '/berita' },
    { label: 'Dokumen', to: '/dokumen' },
    ...(user
      ? [
          { label: 'SOP', to: '/sop' },
          { label: 'Forum', to: '/forum' },
          { label: 'Pembelajaran', to: '/pembelajaran' },
        ]
      : [{ label: 'Kritik & Saran', to: '/kritik-saran' }]),
    { label: 'FAQ & Panduan', to: '/bantuan' },
  ]

  return (
    <footer className="mt-12 bg-brand-900 text-brand-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo bogor.png" alt="Logo Pemerintah Kota Bogor" className="h-10 w-10" />
            <p className="text-lg font-bold text-white">SPBE Kota Bogor</p>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">Portal Manajemen Pengetahuan dan Repositori Arsitektur SPBE</p>
        </div>

        <nav aria-labelledby="footer-tautan">
          <h2 id="footer-tautan" className={judul}>Tautan cepat</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {tautan.map((t) => (
              <li key={t.to}>
                <Link to={t.to} className="inline-flex min-h-6 items-center hover:text-white hover:underline">
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={judul}>Kontak</h2>
          <address className="mt-3 text-sm leading-relaxed not-italic">
            {KONTAK.instansi}
            <br />
            {KONTAK.bidang}
          </address>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">
        <Hakcipta />
      </div>
    </footer>
  )
}
