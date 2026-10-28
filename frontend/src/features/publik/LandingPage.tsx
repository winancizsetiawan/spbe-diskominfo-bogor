import { BookOpen, FileText, MessagesSquare, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { inputClass } from '@/components/ui/Field'
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
    if (q.trim()) navigate(`/cari?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-600 px-6 py-14 text-white sm:px-12">
        <p className="text-sm font-semibold tracking-wide text-brand-200 uppercase">Portal resmi</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Sistem Pemerintahan Berbasis Elektronik Kota Bogor</h1>
        <p className="mt-3 max-w-xl text-brand-100">
          Satu portal untuk informasi, dokumen, pembelajaran, dan kolaborasi transformasi digital pemerintahan.
        </p>
        <form onSubmit={cari} role="search" className="mt-8 flex max-w-xl gap-2 rounded-xl bg-white p-2">
          <label htmlFor="cari-publik" className="sr-only">
            Cari dokumen, berita, atau topik
          </label>
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="cari-publik"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari dokumen atau topik…"
              className={`${inputClass} border-0 pl-9 focus:ring-0`}
            />
          </div>
          <Button type="submit">Cari</Button>
        </form>
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
