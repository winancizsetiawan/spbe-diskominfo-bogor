import { Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { BerkasIcon } from '@/features/dokumen/components/BerkasIcon'
import { JENIS_LABEL, STATUS_LABEL, type Dokumen, type StatusDokumen } from '@/features/dokumen/types'
import { errorMessage } from '@/lib/errors'
import { formatAngka, formatTanggalSingkat, formatUkuran } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarAdminDokumen } from '../api'
import { StatusDialog } from '../components/StatusDialog'
import { StatusDokumenBadge } from '../components/StatusDokumenBadge'
import type { AdminDokumenFilter } from '../types'

type TabKey = 'semua' | StatusDokumen

const TAB: TabKey[] = ['semua', 'draft', 'review', 'berlaku', 'arsip']

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function RepositoriListPage() {
  const [params, ubahFilter] = useUrlFilter()
  const tab = (TAB.includes(params.get('status') as TabKey) ? params.get('status') : 'semua') as TabKey
  const filter: AdminDokumenFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
    status: tab === 'semua' ? undefined : tab,
  }
  const [q, setQ] = useState(filter.q ?? '')
  const daftar = useDaftarAdminDokumen(filter)
  const [diubah, setDiubah] = useState<Dokumen | null>(null)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Repositori"
        description="Kelola dokumen dan SOP: unggah berkas, atur status, dan terbitkan. Pengelolaan artikel menyusul."
        actions={
          <Link to="/admin/repositori/baru" className={buttonClass('primary')}>
            <Plus className="size-4" aria-hidden /> Unggah Dokumen
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div role="group" aria-label="Filter status dokumen" className="flex flex-wrap gap-2">
          {TAB.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              className={chipClass(tab === t)}
              onClick={() => ubahFilter({ status: t === 'semua' ? undefined : t, page: undefined })}
            >
              {t === 'semua' ? 'Semua' : STATUS_LABEL[t]}
              {daftar.data && <span className="ml-1.5 opacity-75">{daftar.data.hitungan[t]}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={cari} role="search" className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
          <label htmlFor="cari-repositori" className="sr-only">
            Cari dokumen
          </label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-repositori"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul… (tekan Enter)"
            className={`${inputClass} pl-9`}
          />
        </form>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Tidak ada dokumen pada filter ini.">
          {tab === 'semua' && !filter.q ? 'Mulai dengan mengunggah dokumen pertama.' : 'Ubah status atau kata kunci pencarian.'}
        </EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table caption={`Daftar dokumen, ${daftar.data.total} data`}>
            <thead>
              <tr>
                <Th>Dokumen</Th>
                <Th>Jenis</Th>
                <Th>Versi</Th>
                <Th>Status</Th>
                <Th>Visibilitas</Th>
                <Th>Unduhan</Th>
                <Th>Rilis</Th>
                <Th>
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {daftar.data.items.map((d) => (
                <tr key={d.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <BerkasIcon tipe={d.tipeBerkas} className="size-9 text-[10px]" />
                      <div className="min-w-0">
                        <Link to={`/dokumen/${d.id}`} className="block max-w-xs truncate font-semibold text-slate-900 hover:text-brand-700">
                          {d.judul}
                        </Link>
                        <span className="text-xs text-slate-500">
                          {d.tipeBerkas.toUpperCase()} · {formatUkuran(d.ukuranMb)}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{d.kategori?.nama ?? JENIS_LABEL[d.jenis]}</Td>
                  <Td className="text-slate-600">v{d.versi}</Td>
                  <Td>
                    <StatusDokumenBadge status={d.status} />
                  </Td>
                  <Td className="text-slate-600">{d.visibilitas === 'publik' ? 'Publik' : 'Internal'}</Td>
                  <Td className="text-slate-600 tabular-nums">{formatAngka(d.jumlahUnduhan)}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatTanggalSingkat(d.tanggalRilis)}</Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => setDiubah(d)}
                      className={buttonClass('secondary', 'px-3 py-1.5 text-xs')}
                      aria-label={`Ubah status ${d.judul}`}
                    >
                      Ubah status
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}

      <StatusDialog dokumen={diubah} onClose={() => setDiubah(null)} />
    </>
  )
}
