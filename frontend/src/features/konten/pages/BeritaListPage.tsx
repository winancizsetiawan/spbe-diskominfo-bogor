import { ChevronDown, Plus, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Dropdown, menuItemClass } from '@/components/ui/Dropdown'
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
  const { user } = useAuth()
  const superAdmin = user?.role === 'super_admin'
  const navigate = useNavigate()
  const [params, ubahFilter] = useUrlFilter()
  const jenisParam = params.get('jenis') as FilterJenis | null
  const jenis = jenisParam && JENIS.includes(jenisParam) ? jenisParam : 'semua'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const daftar = useDaftarArtikel(jenis, page)

  return (
    <>
      <PageHeader
        title="Berita & Artikel"
        description="Kabar terbaru dan tulisan seputar transformasi digital pemerintahan Kota Bogor."
        actions={
          superAdmin && (
            <Dropdown
              align="right"
              tombolClass={buttonClass('primary')}
              label={
                <>
                  <Plus aria-hidden className="size-4" />
                  Tambah
                  <ChevronDown aria-hidden className="size-4" />
                </>
              }
            >
              {(['berita', 'artikel'] as const).map((j) => (
                <button key={j} type="button" role="menuitem" className={menuItemClass} onClick={() => navigate(`/berita/baru?jenis=${j}`)}>
                  {JENIS_LABEL[j]}
                </button>
              ))}
            </Dropdown>
          )
        }
      />
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
                  <h2 className="font-semibold text-slate-900">
                    {a.unggulan && <Star aria-label="Unggulan" className="mr-1.5 -mt-0.5 inline size-4 fill-amber-400 text-amber-500" />}
                    {a.judul}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{a.ringkasan}</p>
                  {(a.kategori || a.label.length > 0) && (
                    <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-500">
                      {a.kategori && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{a.kategori}</span>}
                      {a.label.map((l) => (
                        <span key={l} className="rounded border border-slate-200 px-1.5 py-0.5">
                          #{l}
                        </span>
                      ))}
                    </p>
                  )}
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
