import { BookOpen, FileText, MessagesSquare, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PENCARIAN_POPULER } from '@/features/cari/types'
import { useBerandaPublik } from '@/features/beranda/api'
import { DokumenRow } from '@/features/dokumen/components/DokumenRow'
import { formatAngka } from '@/lib/format'
import { StatistikPublikSection } from './StatistikPublik'

const FITUR = [
  { icon: FileText, judul: 'Dokumen & SOP', isi: 'Regulasi, pedoman, dan SOP TIK dalam satu repositori.', to: '/dokumen' },
  { icon: MessagesSquare, judul: 'Forum Diskusi', isi: 'Konsultasi teknis antar-OPD dan akademisi.', to: '/forum' },
  { icon: BookOpen, judul: 'Pembelajaran', isi: 'Modul pembelajaran mandiri seputar SPBE.', to: '/pembelajaran' },
]

export function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const publik = useBerandaPublik()

  if (user) return <Navigate to="/beranda" replace />

  const cari = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/cari?q=${encodeURIComponent(q.trim())}` : '/cari')
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Foto Balai Kota di kanan, memudar ke putih di sisi teks. Hiasan, jadi alt kosong. */}
        <img src="/hero-balai-kota.webp" alt="" width={672} height={448} className="absolute inset-y-0 right-0 h-full w-full object-cover object-right sm:w-auto sm:max-w-none sm:[mask-image:linear-gradient(to_right,transparent,black_35%)]" />
        <div aria-hidden className="absolute inset-0 bg-white/85 sm:hidden" />
        <div className="relative max-w-xl px-6 py-14 sm:px-12 sm:py-16">
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Portal resmi</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-900 sm:text-5xl">Sistem Pemerintahan Berbasis Elektronik</h1>
          <p className="mt-3 text-slate-700">
            Satu portal untuk mengakses informasi, dokumen, pembelajaran, dan kolaborasi dalam mendukung transformasi digital pemerintahan.
          </p>
          {/* Satu bilah: bingkai dan cincin fokus ada di form, input di dalamnya polos. */}
          <form
            onSubmit={cari}
            role="search"
            className="mt-8 flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-1.5 pl-3 transition-colors sm:pl-4 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-100"
          >
            <label htmlFor="cari-publik" className="sr-only">
              Cari dokumen, SOP, atau berita
            </label>
            {/* Di HP ikon disembunyikan agar placeholder muat utuh; tombol "Cari" sudah menjelaskan fungsinya. */}
            <Search className="hidden size-5 shrink-0 text-slate-500 sm:block" aria-hidden />
            <input
              id="cari-publik"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari dokumen, SOP, berita"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-none"
            />
            <Button type="submit" className="min-h-11 sm:px-5">
              Cari
            </Button>
          </form>
          <div className="mt-4">
            <p className="text-sm text-slate-600">Pencarian populer</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {PENCARIAN_POPULER.map((k) => (
                <li key={k}>
                  <Link
                    to={`/cari?q=${encodeURIComponent(k)}`}
                    className="inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    {k}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {publik.data && (
        <section aria-label="Ringkasan portal" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Dokumen publik', publik.data.dokumenPublik],
            ['SOP berlaku', publik.data.sopBerlaku],
            ['Instansi', publik.data.instansi],
            ['Diskusi aktif', publik.data.diskusi],
          ].map(([label, nilai]) => (
            <Card key={label} className="text-center">
              <p className="text-2xl font-bold text-brand-700">{formatAngka(nilai as number)}</p>
              <p className="text-sm text-slate-600">{label}</p>
            </Card>
          ))}
        </section>
      )}

      {/* Cuplikan Dasbor Publik; tampil hanya bila data dasbor tersedia. */}
      <StatistikPublikSection />

      <section aria-label="Layanan portal" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FITUR.map(({ icon: Icon, judul, isi, to }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition group-hover:border-brand-200 group-hover:shadow-sm">
              <Icon className="size-8 text-brand-600" aria-hidden />
              <h2 className="mt-3 font-semibold text-slate-900">{judul}</h2>
              <p className="mt-1 text-sm text-slate-600">{isi}</p>
            </Card>
          </Link>
        ))}
      </section>

      {publik.data && publik.data.dokumenPopuler.length > 0 && (
        <section aria-labelledby="populer">
          <h2 id="populer" className="mb-3 text-lg font-semibold text-slate-900">
            Dokumen populer
          </h2>
          <ul className="space-y-3">
            {publik.data.dokumenPopuler.map((d) => (
              <DokumenRow key={d.id} dokumen={d} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
