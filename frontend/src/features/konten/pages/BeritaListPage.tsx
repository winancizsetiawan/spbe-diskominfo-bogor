import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { formatTanggalSingkat } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarArtikel } from '../api'
import { JENIS_LABEL, type FilterJenis } from '../types'

const JENIS = Object.keys(JENIS_LABEL) as FilterJenis[]

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function BeritaListPage() {
  const [params, ubahFilter] = useUrlFilter()
  const jenisParam = params.get('jenis') as FilterJenis | null
  const jenis = jenisParam && JENIS.includes(jenisParam) ? jenisParam : 'semua'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const daftar = useDaftarArtikel(jenis, page)

  return (
    <>
      <PageHeader title="Berita & Artikel" description="Kabar terbaru dan tulisan seputar transformasi digital pemerintahan Kota Bogor." />
      <div role="group" aria-label="Filter jenis" className="mb-4 flex gap-2">
        {JENIS.map((j) => (
          <button key={j} type="button" aria-pressed={jenis === j} className={chipClass(jenis === j)} onClick={() => ubahFilter({ jenis: j === 'semua' ? undefined : j, page: undefined })}>
            {JENIS_LABEL[j]}
          </button>
        ))}
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Belum ada tulisan." />
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <ul className="space-y-3">
            {daftar.data.items.map((a) => (
              <li key={a.id}>
                <Link to={`/berita/${a.id}`} className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Badge tone={a.jenis === 'berita' ? 'brand' : 'neutral'}>{JENIS_LABEL[a.jenis]}</Badge>
                    <span className="text-xs text-slate-500">
                      {formatTanggalSingkat(a.tanggal)} · {a.penulis}
                    </span>
                  </div>
                  <h2 className="font-semibold text-slate-900">{a.judul}</h2>
                  <p className="mt-1 text-sm text-slate-600">{a.ringkasan}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(p) => ubahFilter({ page: p })} />
        </div>
      )}
    </>
  )
}
