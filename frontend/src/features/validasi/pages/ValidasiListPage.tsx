import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { errorMessage } from '@/lib/errors'
import { formatTanggal } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { StatusValidasiBadge } from '@/features/katalog/components/StatusBadge'
import { useDaftarPengajuan } from '../api'
import { JENIS_DATA_LABEL, type PengajuanFilter, type StatusPengajuan } from '../types'

type TabKey = 'menunggu' | 'disetujui' | 'perlu_revisi' | 'ditolak' | 'semua'

const TAB: { key: TabKey; label: string }[] = [
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'disetujui', label: 'Disetujui' },
  { key: 'perlu_revisi', label: 'Perlu Revisi' },
  { key: 'ditolak', label: 'Ditolak' },
  { key: 'semua', label: 'Semua' },
]

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function ValidasiListPage() {
  const [params, ubahFilter] = useUrlFilter()
  // Tanpa parameter, tampilkan antrean kerja (Menunggu); "Semua" harus dipilih eksplisit.
  const tab = (TAB.some((t) => t.key === params.get('status')) ? params.get('status') : 'menunggu') as TabKey
  const filter: PengajuanFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
    status: tab === 'semua' ? undefined : (tab as StatusPengajuan),
  }
  const [q, setQ] = useState(filter.q ?? '')
  const daftar = useDaftarPengajuan(filter)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Validasi Data & Arsitektur"
        description="Tinjau pengajuan data aplikasi dan klasifikasi RAA dari Admin OPD."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div role="group" aria-label="Filter status pengajuan" className="flex flex-wrap gap-2">
          {TAB.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              className={chipClass(tab === t.key)}
              onClick={() => ubahFilter({ status: t.key, page: undefined })}
            >
              {t.label}
              {daftar.data && <span className="ml-1.5 opacity-75">{daftar.data.hitungan[t.key]}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={cari} role="search" className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
          <label htmlFor="cari-validasi" className="sr-only">
            Cari aplikasi atau instansi
          </label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-validasi"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari aplikasi atau instansi…"
            className={`${inputClass} pl-9`}
          />
        </form>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title={tab === 'menunggu' && !filter.q ? 'Tidak ada pengajuan yang menunggu.' : 'Tidak ada pengajuan pada filter ini.'}>
          {tab === 'menunggu' && !filter.q && 'Antrean kosong. Pengajuan baru dari Admin OPD akan muncul di sini.'}
        </EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table caption={`Daftar pengajuan validasi, ${daftar.data.total} data`}>
            <thead>
              <tr>
                <Th>Aplikasi</Th>
                <Th>Instansi</Th>
                <Th>Jenis data</Th>
                <Th>Diajukan</Th>
                <Th>Status</Th>
                <Th>
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {daftar.data.items.map((p) => (
                <tr key={p.id}>
                  <Td className="font-semibold text-slate-900">{p.aplikasi.nama}</Td>
                  <Td className="text-slate-600">{p.instansi.nama}</Td>
                  <Td className="text-slate-600">{JENIS_DATA_LABEL[p.jenisData]}</Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {formatTanggal(p.tanggalPengajuan)}
                    <span className="block text-xs text-slate-500">oleh {p.pengaju}</span>
                  </Td>
                  <Td>
                    <StatusValidasiBadge status={p.status} />
                  </Td>
                  <Td className="text-right">
                    <Link
                      to={`/admin/validasi/${p.id}`}
                      className={buttonClass(p.status === 'menunggu' ? 'primary' : 'secondary', 'px-3 py-1.5 text-xs')}
                      aria-label={`${p.status === 'menunggu' ? 'Tinjau' : 'Lihat'} pengajuan ${p.aplikasi.nama}`}
                    >
                      {p.status === 'menunggu' ? 'Tinjau' : 'Lihat'}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}
    </>
  )
}
