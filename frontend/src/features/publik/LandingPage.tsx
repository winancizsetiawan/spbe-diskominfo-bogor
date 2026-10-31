import { BookOpen, FileText, MessagesSquare, Search, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { inputClass } from '@/components/ui/Field'
import { PENCARIAN_POPULER } from '@/features/cari/types'
import { useBerandaPublik } from '@/features/beranda/api'
import { DokumenRow } from '@/features/dokumen/components/DokumenRow'
import { formatAngka } from '@/lib/format'

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
          <form onSubmit={cari} role="search" className="mt-8 flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <label htmlFor="cari-publik" className="sr-only">
              Cari dokumen, berita, atau topik
            </label>
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="cari-publik"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari atau bertanya…"
                className={`${inputClass} border-0 pl-9 focus:ring-0`}
              />
            </div>
            <Button type="submit" className="min-h-11">
              <Sparkles className="size-4" aria-hidden />
              <span className="hidden sm:inline">Cari dengan AI</span>
              <span className="sm:hidden">Cari</span>
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
