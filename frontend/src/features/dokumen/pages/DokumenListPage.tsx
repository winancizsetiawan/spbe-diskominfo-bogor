import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { formatAngka } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarDokumen, useKategoriDokumen, useRingkasanDokumen } from '../api'
import { DokumenRow } from '../components/DokumenRow'
import { JENIS_DOKUMEN, JENIS_LABEL, KELOMPOK_INFO, type DokumenFilter, type JenisDokumen, type Kelompok, type Urutan } from '../types'

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

/** Satu halaman untuk dua kelompok: Dokumen (publik + internal) dan SOP (khusus login). */
export function DokumenListPage({ kelompok }: { kelompok: Kelompok }) {
  const { user } = useAuth()
  const info = KELOMPOK_INFO[kelompok]
  const [params, ubahFilter] = useUrlFilter()
  const filter: DokumenFilter = {
    kelompok,
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
    jenis: (params.get('jenis') as JenisDokumen | null) || undefined,
    kategori: Number(params.get('kategori')) || undefined,
    urut: params.get('urut') === 'populer' ? 'populer' : 'terbaru',
  }
  const [q, setQ] = useState(filter.q ?? '')

  const ringkasan = useRingkasanDokumen(kelompok)
  const kategori = useKategoriDokumen(kelompok, kelompok === 'sop')
  const daftar = useDaftarDokumen(filter)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  const adaFilter = !!(filter.q || filter.jenis || filter.kategori)

  return (
    <>
      <PageHeader title={info.judul} description={info.deskripsi} />

      {!user && (
        <p className="mb-6 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Anda melihat dokumen yang terbuka untuk umum. Masuk untuk mengakses dokumen internal dan SOP.
        </p>
      )}

      <section aria-label="Ringkasan" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={kelompok === 'sop' ? 'Total SOP' : 'Total dokumen'} value={ringkasan.data ? formatAngka(ringkasan.data.total) : '–'} />
        <StatCard
          label={kelompok === 'sop' ? 'Berlaku · dalam review' : 'Berlaku'}
          value={ringkasan.data ? (kelompok === 'sop' ? `${ringkasan.data.berlaku} · ${ringkasan.data.review}` : ringkasan.data.berlaku) : '–'}
          tone="success"
        />
        <StatCard label="Total unduhan" value={ringkasan.data ? formatAngka(ringkasan.data.totalUnduhan) : '–'} />
      </section>

      <div className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={cari} role="search" className="relative min-w-60 flex-1">
            <label htmlFor="cari-dokumen" className="sr-only">
              Cari {info.judul.toLowerCase()}
            </label>
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="cari-dokumen"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul atau isi… (tekan Enter)"
              className={`${inputClass} pl-9`}
            />
          </form>
          <div className="w-full sm:w-48">
            <label htmlFor="urut-dokumen" className="sr-only">
              Urutkan
            </label>
            <select
              id="urut-dokumen"
              value={filter.urut}
              onChange={(e) => ubahFilter({ urut: (e.target.value as Urutan) === 'terbaru' ? undefined : e.target.value, page: undefined })}
              className={inputClass}
            >
              <option value="terbaru">Urutkan: Terbaru</option>
              <option value="populer">Urutkan: Terpopuler</option>
            </select>
          </div>
        </div>

        <div role="group" aria-label={kelompok === 'sop' ? 'Filter kategori' : 'Filter jenis'} className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!filter.jenis && !filter.kategori}
            className={chipClass(!filter.jenis && !filter.kategori)}
            onClick={() => ubahFilter({ jenis: undefined, kategori: undefined, page: undefined })}
          >
            Semua
          </button>
          {kelompok === 'sop'
            ? kategori.data?.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={filter.kategori === k.id}
                  className={chipClass(filter.kategori === k.id)}
                  onClick={() => ubahFilter({ kategori: k.id, page: undefined })}
                >
                  {k.nama}
                </button>
              ))
            : JENIS_DOKUMEN.map((j) => (
                <button
                  key={j}
                  type="button"
                  aria-pressed={filter.jenis === j}
                  className={chipClass(filter.jenis === j)}
                  onClick={() => ubahFilter({ jenis: j, page: undefined })}
                >
                  {JENIS_LABEL[j]}
                </button>
              ))}
        </div>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Tidak ada dokumen yang cocok.">
          {adaFilter ? 'Coba kata kunci atau filter lain.' : 'Belum ada dokumen yang dapat Anda akses.'}
        </EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">
            {formatAngka(daftar.data.total)} dokumen
          </p>
          <ul className="space-y-3">
            {daftar.data.items.map((d) => (
              <DokumenRow key={d.id} dokumen={d} />
            ))}
          </ul>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}
    </>
  )
}
