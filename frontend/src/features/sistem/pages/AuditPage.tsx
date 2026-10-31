import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ROLE_LABEL } from '@/auth/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { errorMessage } from '@/lib/errors'
import { formatWaktuLengkap } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { AKSI_LABEL, type AksiAktivitas } from '@/features/profil/types'
import { useAudit } from '../api'
import { KATEGORI_AUDIT_LABEL, type AuditFilter, type FilterKategoriAudit, type HasilAudit } from '../types'

const KATEGORI = Object.keys(KATEGORI_AUDIT_LABEL) as FilterKategoriAudit[]
const AKSI = Object.keys(AKSI_LABEL) as AksiAktivitas[]

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function AuditPage() {
  const [params, ubahFilter] = useUrlFilter()
  const kategoriParam = params.get('kategori') as FilterKategoriAudit | null
  const aksiParam = params.get('aksi') as AksiAktivitas | null
  const hasilParam = params.get('hasil')
  const filter: AuditFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    kategori: kategoriParam && KATEGORI.includes(kategoriParam) ? kategoriParam : 'semua',
    aksi: aksiParam && AKSI.includes(aksiParam) ? aksiParam : undefined,
    hasil: hasilParam === 'berhasil' || hasilParam === 'gagal' ? (hasilParam as HasilAudit) : undefined,
    q: params.get('q') || undefined,
    dari: params.get('dari') || undefined,
    sampai: params.get('sampai') || undefined,
  }
  const [q, setQ] = useState(filter.q ?? '')
  const audit = useAudit(filter)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  const rentangTerbalik = !!filter.dari && !!filter.sampai && filter.dari > filter.sampai
  const adaFilter = !!(filter.aksi || filter.hasil || filter.q || filter.dari || filter.sampai)
  const reset = () => {
    setQ('')
    ubahFilter({ aksi: undefined, hasil: undefined, q: undefined, dari: undefined, sampai: undefined, page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Audit Trail"
        description="Catatan aktivitas dan kejadian keamanan seluruh pengguna. Hanya dapat dibaca; data sensitif seperti kata sandi tidak pernah dicatat."
      />

      <div className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filter kategori" className="flex flex-wrap gap-2">
            {KATEGORI.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter.kategori === k}
                className={chipClass(filter.kategori === k)}
                onClick={() => ubahFilter({ kategori: k === 'semua' ? undefined : k, page: undefined })}
              >
                {KATEGORI_AUDIT_LABEL[k]}
                {audit.data && <span className="ml-1.5 opacity-75">{audit.data.hitungan[k]}</span>}
              </button>
            ))}
          </div>
          <form onSubmit={cari} role="search" className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
            <label htmlFor="cari-audit" className="sr-only">
              Cari pengguna, deskripsi, atau alamat IP
            </label>
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="cari-audit"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari pengguna, deskripsi, IP…"
              className={`${inputClass} pl-9`}
            />
          </form>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="audit-aksi" className="block text-xs font-medium text-slate-600">
              Aksi
            </label>
            <select id="audit-aksi" className={inputClass} value={filter.aksi ?? ''} onChange={(e) => ubahFilter({ aksi: e.target.value, page: undefined })}>
              <option value="">Semua aksi</option>
              {AKSI.map((a) => (
                <option key={a} value={a}>
                  {AKSI_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="audit-hasil" className="block text-xs font-medium text-slate-600">
              Hasil
            </label>
            <select id="audit-hasil" className={inputClass} value={filter.hasil ?? ''} onChange={(e) => ubahFilter({ hasil: e.target.value, page: undefined })}>
              <option value="">Semua hasil</option>
              <option value="berhasil">Berhasil</option>
              <option value="gagal">Gagal</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="audit-dari" className="block text-xs font-medium text-slate-600">
              Dari tanggal
            </label>
            <input id="audit-dari" type="date" className={inputClass} value={filter.dari ?? ''} max={filter.sampai} onChange={(e) => ubahFilter({ dari: e.target.value, page: undefined })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="audit-sampai" className="block text-xs font-medium text-slate-600">
              Sampai tanggal
            </label>
            <input id="audit-sampai" type="date" className={inputClass} value={filter.sampai ?? ''} min={filter.dari} onChange={(e) => ubahFilter({ sampai: e.target.value, page: undefined })} />
          </div>
        </div>
        {rentangTerbalik && (
          <p role="alert" className="text-sm text-red-600">
            Tanggal awal tidak boleh setelah tanggal akhir.
          </p>
        )}
        {adaFilter && (
          <Button variant="secondary" onClick={reset}>
            Atur ulang filter
          </Button>
        )}
      </div>

      {audit.isPending ? (
        <Spinner className="py-16" />
      ) : audit.isError ? (
        <ErrorState message={errorMessage(audit.error)} onRetry={() => void audit.refetch()} />
      ) : audit.data.items.length === 0 ? (
        <EmptyState title="Tidak ada catatan yang cocok.">Ubah filter atau rentang tanggal.</EmptyState>
      ) : (
        <div className={audit.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table caption={`Audit trail, ${audit.data.total} catatan`}>
            <thead>
              <tr>
                <Th>Waktu</Th>
                <Th>Pengguna</Th>
                <Th>Aksi</Th>
                <Th>Keterangan</Th>
                <Th>Hasil</Th>
              </tr>
            </thead>
            <tbody>
              {audit.data.items.map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-slate-600">
                    <time dateTime={a.waktu}>{formatWaktuLengkap(a.waktu)}</time>
                  </Td>
                  <Td>
                    {a.pengguna ? (
                      <>
                        <p className="font-semibold text-slate-900">{a.pengguna.nama}</p>
                        <p className="text-xs text-slate-500">{ROLE_LABEL[a.pengguna.role]}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">Tidak dikenal</p>
                    )}
                    {a.ipAddress && <p className="text-xs text-slate-500">IP {a.ipAddress}</p>}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={a.kategori === 'keamanan' ? 'warning' : 'brand'}>{AKSI_LABEL[a.aksi]}</Badge>
                    </div>
                  </Td>
                  <Td className="text-slate-700">{a.deskripsi}</Td>
                  <Td>
                    <Badge tone={a.hasil === 'berhasil' ? 'success' : 'danger'}>{a.hasil === 'berhasil' ? 'Berhasil' : 'Gagal'}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={audit.data.page} totalPages={audit.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}
    </>
  )
}
