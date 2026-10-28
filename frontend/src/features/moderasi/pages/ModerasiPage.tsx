import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarModerasi } from '../api'
import { ModerasiCard } from '../components/ModerasiCard'
import { TindakanDialog, type TargetTindakan } from '../components/TindakanDialog'
import { TAB_LABEL, type ModerasiFilter, type TabModerasi } from '../types'

const TAB: TabModerasi[] = ['dilaporkan', 'semua', 'selesai']

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function ModerasiPage() {
  const [params, ubahFilter] = useUrlFilter()
  // Tanpa parameter, tampilkan antrean kerja (Dilaporkan).
  const tab = (TAB.includes(params.get('tab') as TabModerasi) ? params.get('tab') : 'dilaporkan') as TabModerasi
  const filter: ModerasiFilter = {
    tab,
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
  }
  const [q, setQ] = useState(filter.q ?? '')
  const daftar = useDaftarModerasi(filter)
  const [target, setTarget] = useState<TargetTindakan | null>(null)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Moderasi Forum"
        description="Tinjau thread dan balasan yang dilaporkan, lalu abaikan laporan, kunci thread, atau sembunyikan konten."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div role="group" aria-label="Filter antrean moderasi" className="flex flex-wrap gap-2">
          {TAB.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              className={chipClass(tab === t)}
              onClick={() => ubahFilter({ tab: t, page: undefined })}
            >
              {TAB_LABEL[t]}
              {daftar.data && <span className="ml-1.5 opacity-75">{daftar.data.hitungan[t]}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={cari} role="search" className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
          <label htmlFor="cari-moderasi" className="sr-only">
            Cari judul atau pengguna
          </label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-moderasi"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul atau pengguna…"
            className={`${inputClass} pl-9`}
          />
        </form>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title={tab === 'dilaporkan' && !filter.q ? 'Tidak ada laporan yang menunggu.' : 'Tidak ada item pada filter ini.'}>
          {tab === 'dilaporkan' && !filter.q && 'Antrean kosong. Laporan baru dari pengguna akan muncul di sini.'}
        </EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <ul className="space-y-4">
            {daftar.data.items.map((item) => (
              <ModerasiCard
                key={`${item.targetTipe}-${item.targetId}`}
                item={item}
                onTindak={(tindakan) => setTarget({ item, tindakan })}
              />
            ))}
          </ul>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}

      <TindakanDialog target={target} onClose={() => setTarget(null)} />
    </>
  )
}
