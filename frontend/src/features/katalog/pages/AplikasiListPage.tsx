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
import { Table, Td, Th } from '@/components/ui/Table'
import { errorMessage } from '@/lib/errors'
import { formatTanggal } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarAplikasi, useRingkasanAplikasi } from '../api'
import { AjukanDialog, type TargetAjukan } from '../components/AjukanDialog'
import { STATUS_RAA, STATUS_VALIDASI, StatusRaaBadge, StatusValidasiBadge } from '../components/StatusBadge'
import { BISA_DIAJUKAN, type AplikasiFilter, type StatusRaa, type StatusValidasi } from '../types'

export function AplikasiListPage() {
  const { user, can } = useAuth()
  const lintasInstansi = user?.role === 'super_admin'
  const bolehAjukan = can('validasi:ajukan')

  const [params, ubahFilter] = useUrlFilter()
  const filter: AplikasiFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
    statusValidasi: (params.get('statusValidasi') as StatusValidasi | null) || undefined,
    statusRaa: (params.get('statusRaa') as StatusRaa | null) || undefined,
  }
  const [q, setQ] = useState(filter.q ?? '')
  const ringkasan = useRingkasanAplikasi()
  const daftar = useDaftarAplikasi(filter)
  const [ajukan, setAjukan] = useState<TargetAjukan | null>(null)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Data Aplikasi"
        description={lintasInstansi ? 'Seluruh aplikasi milik instansi di Kota Bogor.' : `Aplikasi milik ${user?.instansi.nama}.`}
        actions={
          <Link to="/katalog/aplikasi/baru" className={buttonClass('primary')}>
            <Plus className="size-4" aria-hidden /> Tambah Aplikasi
          </Link>
        }
      />

      <section aria-label="Ringkasan" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total aplikasi" value={ringkasan.data?.total ?? '–'} />
        <StatCard label="Sesuai RAA" value={ringkasan.data?.sesuai ?? '–'} tone="success" />
        <StatCard label="Perlu penyesuaian" value={ringkasan.data?.perluPenyesuaian ?? '–'} tone="warning" />
        <StatCard label="Belum sesuai" value={ringkasan.data?.belum ?? '–'} tone="danger" />
      </section>

      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={cari} role="search" className="relative min-w-60 flex-1">
          <label htmlFor="cari-aplikasi" className="sr-only">
            Cari aplikasi
          </label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-aplikasi"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama aplikasi… (tekan Enter)"
            className={`${inputClass} pl-9`}
          />
        </form>
        <div className="w-full sm:w-52">
          <label className="sr-only" htmlFor="filter-validasi">
            Status validasi
          </label>
          <select
            id="filter-validasi"
            value={filter.statusValidasi ?? ''}
            onChange={(e) => ubahFilter({ statusValidasi: e.target.value, page: undefined })}
            className={inputClass}
          >
            <option value="">Semua status validasi</option>
            {Object.entries(STATUS_VALIDASI).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-52">
          <label className="sr-only" htmlFor="filter-raa">
            Status RAA
          </label>
          <select
            id="filter-raa"
            value={filter.statusRaa ?? ''}
            onChange={(e) => ubahFilter({ statusRaa: e.target.value, page: undefined })}
            className={inputClass}
          >
            <option value="">Semua status RAA</option>
            {Object.entries(STATUS_RAA).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Tidak ada aplikasi yang cocok.">
          {filter.q || filter.statusRaa || filter.statusValidasi ? 'Ubah kata kunci atau filter.' : 'Tambahkan aplikasi pertama instansi Anda.'}
        </EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table caption={`Daftar aplikasi, ${daftar.data.total} data`}>
            <thead>
              <tr>
                <Th>Nama aplikasi</Th>
                {lintasInstansi && <Th>Instansi</Th>}
                <Th>Kategori</Th>
                <Th>Status RAA</Th>
                <Th>Status validasi</Th>
                <Th>Diperbarui</Th>
                <Th>
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {daftar.data.items.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <p className="font-semibold text-slate-900">{a.nama}</p>
                    <p className="line-clamp-1 max-w-xs text-xs text-slate-500">{a.deskripsi || '—'}</p>
                  </Td>
                  {lintasInstansi && <Td className="text-slate-600">{a.instansi.nama}</Td>}
                  <Td className="text-slate-600">{a.kategori ?? '—'}</Td>
                  <Td>
                    <StatusRaaBadge status={a.statusRaa} />
                  </Td>
                  <Td>
                    <StatusValidasiBadge status={a.statusValidasi} />
                    {a.catatanValidasi && (
                      <p className="mt-1 max-w-48 text-xs text-slate-500">Catatan: {a.catatanValidasi}</p>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatTanggal(a.diperbaruiPada)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {a.statusValidasi === 'menunggu' ? (
                        <span className="text-xs text-slate-500">Menunggu keputusan</span>
                      ) : (
                        <Link
                          to={`/katalog/aplikasi/${a.id}/ubah`}
                          className={buttonClass('secondary', 'px-3 py-1.5 text-xs')}
                          aria-label={`Ubah ${a.nama}`}
                        >
                          Ubah
                        </Link>
                      )}
                      {bolehAjukan && BISA_DIAJUKAN.includes(a.statusValidasi) && (
                        <button
                          type="button"
                          onClick={() => setAjukan({ jenis: 'satu', aplikasi: a })}
                          className={buttonClass('primary', 'px-3 py-1.5 text-xs')}
                          aria-label={`Ajukan validasi ${a.nama}`}
                        >
                          Ajukan
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={daftar.data.page}
            totalPages={daftar.data.totalPages}
            onChange={(page) => ubahFilter({ page })}
          />
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Mengubah data yang sudah Disetujui, Perlu Revisi, atau Ditolak mengembalikan statusnya ke Draft. Data yang
        sedang Menunggu tidak dapat diubah sampai Super Admin memutuskan.
      </p>

      <AjukanDialog target={ajukan} onClose={() => setAjukan(null)} />
    </>
  )
}
