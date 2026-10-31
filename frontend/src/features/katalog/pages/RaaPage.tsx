import { Search, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button, buttonClass } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { errorMessage } from '@/lib/errors'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarAplikasi, useReferensiRaa, useRingkasanAplikasi } from '../api'
import { AjukanDialog, type TargetAjukan } from '../components/AjukanDialog'
import { NilaiBar } from '../components/NilaiBar'
import { StatusRaaBadge, StatusValidasiBadge } from '../components/StatusBadge'
import { labelRaa, type AplikasiFilter, type StatusRaa } from '../types'

const TAB: { value?: StatusRaa; label: string }[] = [
  { label: 'Semua' },
  { value: 'sesuai', label: 'Sesuai' },
  { value: 'perlu_penyesuaian', label: 'Perlu Penyesuaian' },
  { value: 'belum', label: 'Belum Sesuai' },
]

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function RaaPage() {
  const { user, can } = useAuth()
  const lintasInstansi = user?.role === 'super_admin'
  const bolehAjukan = can('validasi:ajukan')

  const [params, ubahFilter] = useUrlFilter()
  const filter: AplikasiFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
    statusRaa: (params.get('statusRaa') as StatusRaa | null) || undefined,
  }
  const [q, setQ] = useState(filter.q ?? '')
  const ringkasan = useRingkasanAplikasi()
  const daftar = useDaftarAplikasi(filter)
  const pohon = useReferensiRaa()
  const [ajukan, setAjukan] = useState<TargetAjukan | null>(null)

  const jumlahTab: Record<string, number | undefined> = {
    semua: ringkasan.data?.total,
    sesuai: ringkasan.data?.sesuai,
    perlu_penyesuaian: ringkasan.data?.perluPenyesuaian,
    belum: ringkasan.data?.belum,
  }

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Klasifikasi RAA"
        description="Kepatuhan klasifikasi Referensi Arsitektur Aplikasi. Nilai kesesuaian dihitung otomatis dari kelengkapan data."
        actions={
          bolehAjukan && (
            <Button onClick={() => setAjukan({ jenis: 'semua' })}>
              <Send className="size-4" aria-hidden /> Ajukan Semua RAA
            </Button>
          )
        }
      />

      <section aria-label="Ringkasan" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total aplikasi" value={ringkasan.data?.total ?? '–'} />
        <StatCard label="Sesuai (≥ 80%)" value={ringkasan.data?.sesuai ?? '–'} tone="success" />
        <StatCard label="Perlu penyesuaian (50–79%)" value={ringkasan.data?.perluPenyesuaian ?? '–'} tone="warning" />
        <StatCard label="Belum sesuai (< 50%)" value={ringkasan.data?.belum ?? '–'} tone="danger" />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div role="group" aria-label="Filter status RAA" className="flex flex-wrap gap-2">
          {TAB.map((t) => {
            const aktif = filter.statusRaa === t.value
            const jumlah = jumlahTab[t.value ?? 'semua']
            return (
              <button
                key={t.label}
                type="button"
                aria-pressed={aktif}
                className={chipClass(aktif)}
                onClick={() => ubahFilter({ statusRaa: t.value, page: undefined })}
              >
                {t.label}
                {jumlah !== undefined && <span className="ml-1.5 opacity-75">{jumlah}</span>}
              </button>
            )
          })}
        </div>
        <form onSubmit={cari} role="search" className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
          <label htmlFor="cari-raa" className="sr-only">
            Cari aplikasi
          </label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-raa"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama aplikasi…"
            className={`${inputClass} pl-9`}
          />
        </form>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Tidak ada aplikasi pada filter ini." />
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table caption={`Klasifikasi RAA, ${daftar.data.total} aplikasi`}>
            <thead>
              <tr>
                <Th>Nama aplikasi</Th>
                {lintasInstansi && <Th>Instansi</Th>}
                <Th>Klasifikasi RAA</Th>
                <Th>Status RAA</Th>
                <Th>Nilai kesesuaian</Th>
                <Th>Validasi</Th>
                <Th>
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {daftar.data.items.map((a) => {
                const raa = labelRaa(a.raa, pohon.data)
                return (
                  <tr key={a.id}>
                    <Td className="font-semibold text-slate-900">{a.nama}</Td>
                    {lintasInstansi && <Td className="text-slate-600">{a.instansi.nama}</Td>}
                    <Td className={raa ? 'text-slate-700' : 'text-slate-500 italic'}>{raa ?? 'Belum diklasifikasi'}</Td>
                    <Td>
                      <StatusRaaBadge status={a.statusRaa} />
                    </Td>
                    <Td>
                      <NilaiBar nilai={a.nilaiKesesuaian} label={`Nilai kesesuaian ${a.nama}`} />
                    </Td>
                    <Td>
                      <StatusValidasiBadge status={a.statusValidasi} />
                    </Td>
                    <Td className="text-right">
                      {a.statusValidasi !== 'menunggu' && (
                        <Link
                          to={`/katalog/aplikasi/${a.id}/ubah`}
                          className={buttonClass('secondary', 'px-3 py-1.5 text-xs')}
                          aria-label={`Klasifikasi ${a.nama}`}
                        >
                          Klasifikasi
                        </Link>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}

      <AjukanDialog target={ajukan} onClose={() => setAjukan(null)} />
    </>
  )
}
