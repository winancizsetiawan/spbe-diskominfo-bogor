import { Info, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { buttonClass } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState, ErrorState } from '@/components/ui/States'
import type { StatusValidasi } from '@/features/katalog/types'
import { errorMessage } from '@/lib/errors'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarFlowchart } from '../api'
import { FlowchartCard } from '../components/FlowchartCard'
import { KATEGORI_LABEL, STATUS_FLOWCHART_LABEL, type FlowchartFilter, type KategoriProses } from '../types'

const KATEGORI: KategoriProses[] = ['utama', 'sub', 'pendukung', 'manajemen']

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function FlowchartListPage() {
  const { user } = useAuth()
  const adalahAdminOpd = user?.role === 'admin_opd'
  const [params, ubahFilter] = useUrlFilter()
  const kategoriParam = params.get('kategori') as KategoriProses | null
  const filter: FlowchartFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
    kategori: kategoriParam && KATEGORI.includes(kategoriParam) ? kategoriParam : undefined,
    status: (params.get('status') as StatusValidasi | null) || undefined,
  }
  const [q, setQ] = useState(filter.q ?? '')
  const daftar = useDaftarFlowchart(filter)
  const hitungan = daftar.data?.hitungan

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Flowchart Proses Bisnis"
        description={adalahAdminOpd ? `Dokumentasi proses bisnis ${user?.instansi.nama}.` : 'Dokumentasi proses bisnis seluruh instansi.'}
        actions={
          adalahAdminOpd && (
            <Link to="/katalog/flowchart/baru" className={buttonClass('primary')}>
              <Plus className="size-4" aria-hidden /> Buat Flowchart
            </Link>
          )
        }
      />

      <section aria-label="Ringkasan" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total diagram" value={hitungan?.total ?? '–'} />
        <StatCard label="Dipublikasikan" value={hitungan?.dipublikasikan ?? '–'} tone="success" />
        <StatCard label="Menunggu validasi" value={hitungan?.menunggu ?? '–'} />
        <StatCard label="Draft / perlu revisi" value={hitungan?.draft ?? '–'} tone="warning" hint="Sedang dikerjakan operator" />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div role="group" aria-label="Filter kategori proses" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!filter.kategori} className={chipClass(!filter.kategori)} onClick={() => ubahFilter({ kategori: undefined, page: undefined })}>
            Semua
            {hitungan && <span className="ml-1.5 opacity-75">{hitungan.perKategori.semua}</span>}
          </button>
          {KATEGORI.filter((k) => !hitungan || hitungan.perKategori[k] > 0 || filter.kategori === k).map((k) => (
            <button key={k} type="button" aria-pressed={filter.kategori === k} className={chipClass(filter.kategori === k)} onClick={() => ubahFilter({ kategori: k, page: undefined })}>
              {KATEGORI_LABEL[k]}
              {hitungan && <span className="ml-1.5 opacity-75">{hitungan.perKategori[k]}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto flex w-full flex-wrap gap-3 sm:w-auto">
          <div className="w-full sm:w-48">
            <label htmlFor="status-flowchart" className="sr-only">
              Status
            </label>
            <select id="status-flowchart" value={filter.status ?? ''} onChange={(e) => ubahFilter({ status: e.target.value, page: undefined })} className={inputClass}>
              <option value="">Semua status</option>
              {(Object.keys(STATUS_FLOWCHART_LABEL) as StatusValidasi[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_FLOWCHART_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <form onSubmit={cari} role="search" className="relative w-full sm:w-64">
            <label htmlFor="cari-flowchart" className="sr-only">
              Cari flowchart
            </label>
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input id="cari-flowchart" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode, atau PIC…" className={`${inputClass} pl-9`} />
          </form>
        </div>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Tidak ada flowchart yang cocok.">
          {filter.q || filter.kategori || filter.status ? 'Ubah kata kunci atau filter.' : adalahAdminOpd ? 'Mulai dengan membuat flowchart pertama.' : undefined}
        </EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {daftar.data.items.map((f) => (
              <FlowchartCard key={f.id} flowchart={f} tampilkanInstansi={!adalahAdminOpd} />
            ))}
          </ul>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Selaraskan diagram dengan peta proses bisnis instansi hingga level sub-proses, sesuai pedoman arsitektur SPBE. Mengubah flowchart
        membuat versi baru dan mengembalikan statusnya ke Draft.
      </p>
    </>
  )
}
