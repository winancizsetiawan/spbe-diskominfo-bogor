import { CheckCheck, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarNotifikasi, useTandaiDibaca, useTandaiSemuaDibaca } from '../api'
import { NotifikasiItem } from '../components/NotifikasiItem'
import { KATEGORI_LABEL, URUTAN_KATEGORI, type FilterKategori, type NotifikasiFilter } from '../types'

const chipClass = (aktif: boolean) =>
  `min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function NotifikasiPage() {
  const [params, ubahFilter] = useUrlFilter()
  const kategoriParam = params.get('kategori') as FilterKategori | null
  const filter: NotifikasiFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    kategori: kategoriParam && URUTAN_KATEGORI.includes(kategoriParam) ? kategoriParam : 'semua',
  }
  const daftar = useDaftarNotifikasi(filter)
  const tandai = useTandaiDibaca()
  const tandaiSemua = useTandaiSemuaDibaca()
  const totalBaru = daftar.data?.belumDibaca.semua ?? 0

  const semuaDibaca = () =>
    tandaiSemua.mutate('semua', {
      onSuccess: ({ diperbarui }) => toast.success(diperbarui > 0 ? `${diperbarui} notifikasi ditandai dibaca.` : 'Semua notifikasi sudah dibaca.'),
      onError: (err) => toast.error(errorMessage(err)),
    })

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifikasi"
        description="Informasi terbaru seputar aktivitas Anda di portal."
        actions={
          <Button variant="secondary" onClick={semuaDibaca} disabled={totalBaru === 0 || tandaiSemua.isPending}>
            <CheckCheck className="size-4" aria-hidden /> Tandai semua dibaca
          </Button>
        }
      />

      <div role="group" aria-label="Filter kategori notifikasi" className="mb-5 flex flex-wrap gap-2">
        {URUTAN_KATEGORI.map((k) => {
          const baru = daftar.data?.belumDibaca[k] ?? 0
          return (
            <button
              key={k}
              type="button"
              aria-pressed={filter.kategori === k}
              className={chipClass(filter.kategori === k)}
              onClick={() => ubahFilter({ kategori: k === 'semua' ? undefined : k, page: undefined })}
            >
              {KATEGORI_LABEL[k]}
              {baru > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${filter.kategori === k ? 'bg-white/25' : 'bg-brand-100 text-brand-700'}`}>
                  {baru}
                  <span className="sr-only"> belum dibaca</span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title={filter.kategori === 'semua' ? 'Belum ada notifikasi.' : `Belum ada notifikasi ${KATEGORI_LABEL[filter.kategori].toLowerCase()}.`}>
          Notifikasi baru akan muncul di sini.
        </EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">
            {totalBaru > 0 ? `${totalBaru} belum dibaca` : 'Semua sudah dibaca'} · {daftar.data.total} notifikasi
          </p>
          <ul className="space-y-3">
            {daftar.data.items.map((n) => (
              <NotifikasiItem
                key={n.id}
                notifikasi={n}
                onBuka={() => !n.sudahDibaca && tandai.mutate(n.id)}
                onTandaiDibaca={() => tandai.mutate(n.id, { onError: (err) => toast.error(errorMessage(err)) })}
              />
            ))}
          </ul>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}

      <aside className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm">
        <p className="flex items-start gap-2 text-brand-900">
          <SlidersHorizontal className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Preferensi notifikasi.</span> Notifikasi di portal selalu aktif; pengiriman email dapat diatur di profil Anda.
          </span>
        </p>
        <Link to="/profil?tab=preferensi" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">
          Kelola preferensi
        </Link>
      </aside>
    </div>
  )
}
