import { AppWindow, BookOpen, CircleHelp, FileText, GitBranch, Info, MessagesSquare, Newspaper, Search, type LucideIcon } from 'lucide-react'
import { Fragment, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useCari } from '../api'
import { BATAS_CARI, kataKunci, PENCARIAN_POPULER, TIPE_LABEL, TIPE_PUBLIK, type FilterTipe, type TipeHasil } from '../types'

const TIPE = Object.keys(TIPE_LABEL) as FilterTipe[]
const IKON: Record<TipeHasil, LucideIcon> = {
  dokumen: FileText,
  sop: FileText,
  forum: MessagesSquare,
  berita: Newspaper,
  bantuan: CircleHelp,
  kursus: BookOpen,
  aplikasi: AppWindow,
  flowchart: GitBranch,
}

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Menandai kata kunci lewat elemen React, bukan HTML mentah, sehingga teks dari server tetap aman dari XSS. */
function Tandai({ teks, kata }: { teks: string; kata: string[] }) {
  if (kata.length === 0) return <>{teks}</>
  const bagian = teks.split(new RegExp(`(${kata.map(escapeRegex).join('|')})`, 'gi'))
  return (
    <>
      {bagian.map((b, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-amber-100 px-0.5 text-inherit">
            {b}
          </mark>
        ) : (
          <Fragment key={i}>{b}</Fragment>
        ),
      )}
    </>
  )
}

export function CariPage() {
  const { user } = useAuth()
  const [params, ubahFilter] = useUrlFilter()
  const tipeParam = params.get('tipe') as FilterTipe | null
  const q = (params.get('q') ?? '').slice(0, BATAS_CARI.max)
  const filter = {
    q,
    tipe: tipeParam && TIPE.includes(tipeParam) ? tipeParam : ('semua' as FilterTipe),
    page: Math.max(1, Number(params.get('page')) || 1),
  }
  const [input, setInput] = useState(q)
  const cari = useCari(filter)
  const kata = kataKunci(q)
  const terlaluPendek = q.trim().length < BATAS_CARI.min

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: input.trim(), page: undefined, tipe: undefined })
  }

  return (
    <>
      <PageHeader title="Pencarian" description={`Pencarian pintar untuk ${user ? 'dokumen, SOP, forum, berita, bantuan, kursus, aplikasi, dan flowchart' : 'dokumen publik, berita, dan bantuan'}. Gunakan kata kunci atau tulis pertanyaan.`} />

      <form onSubmit={kirim} role="search" className="mb-4 flex gap-2">
        <label htmlFor="cari-q" className="sr-only">
          Kata kunci atau pertanyaan
        </label>
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-q"
            type="search"
            value={input}
            maxLength={BATAS_CARI.max}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Contoh: bagaimana cara backup data aplikasi?"
            className={`${inputClass} pl-9`}
          />
        </div>
        <Button type="submit">Cari</Button>
      </form>

      {terlaluPendek ? (
        <EmptyState title={q ? `Masukkan minimal ${BATAS_CARI.min} karakter.` : 'Mulai dengan mengetik kata kunci.'}>
          Anda juga dapat bertanya dalam kalimat biasa.
          <span className="mt-4 block text-sm font-medium text-slate-700">Pencarian populer</span>
          <span className="mt-2 flex flex-wrap justify-center gap-2">
            {PENCARIAN_POPULER.map((k) => (
              <Link key={k} to={`/cari?q=${encodeURIComponent(k)}`} className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
                {k}
              </Link>
            ))}
          </span>
        </EmptyState>
      ) : cari.isPending ? (
        <Spinner className="py-16" />
      ) : cari.isError ? (
        <ErrorState message={errorMessage(cari.error)} onRetry={() => void cari.refetch()} />
      ) : (
        <div className={cari.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {cari.data.fallback && (
            <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>Pencarian pintar sedang tidak tersedia, sehingga hasil memakai pencarian kata kunci. Coba kata yang tepat sama dengan isi dokumen.</p>
            </div>
          )}
          {!user && (
            <p className="mb-4 text-sm text-slate-600">
              Anda mencari sebagai pengunjung, jadi hanya konten publik yang ditampilkan.{' '}
              <Link to="/masuk" className="font-medium text-brand-700 hover:underline">
                Masuk
              </Link>{' '}
              untuk hasil lengkap termasuk SOP, forum, kursus, dan data instansi.
            </p>
          )}

          <div role="group" aria-label="Filter jenis" className="mb-4 flex flex-wrap gap-2">
            {TIPE.filter((t) => (user || TIPE_PUBLIK.includes(t)) && (t === 'semua' || t === filter.tipe || cari.data.hitungan[t] > 0)).map((t) => (
              <button key={t} type="button" aria-pressed={filter.tipe === t} className={chipClass(filter.tipe === t)} onClick={() => ubahFilter({ tipe: t === 'semua' ? undefined : t, page: undefined })}>
                {TIPE_LABEL[t]}
                <span className="ml-1.5 opacity-75">{cari.data.hitungan[t]}</span>
              </button>
            ))}
          </div>

          {cari.data.items.length === 0 ? (
            <EmptyState title={`Tidak ada hasil untuk “${q}”.`}>Coba kata kunci lain atau pilih jenis “Semua”.</EmptyState>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-500" aria-live="polite">
                {cari.data.total} hasil untuk “{q}”
              </p>
              <ul className="space-y-3">
                {cari.data.items.map((h) => (
                  <li key={`${h.tipe}-${h.id}`}>
                    <Link to={h.url} className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone={h.tipe === 'forum' ? 'warning' : 'brand'}>
                          {(() => {
                            const Ikon = IKON[h.tipe]
                            return <Ikon className="size-3" aria-hidden />
                          })()}
                          {TIPE_LABEL[h.tipe]}
                        </Badge>
                        <span className="text-xs text-slate-500">{h.meta}</span>
                      </div>
                      <h2 className="font-semibold text-slate-900">
                        <Tandai teks={h.judul} kata={kata} />
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        <Tandai teks={h.cuplikan} kata={kata} />
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination page={cari.data.page} totalPages={cari.data.totalPages} onChange={(page) => ubahFilter({ page })} />
            </>
          )}
        </div>
      )}
    </>
  )
}
