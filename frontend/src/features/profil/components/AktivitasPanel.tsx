import { CalendarClock, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { formatTanggal } from '@/lib/format'
import { useAktivitas, useHapusAktivitas, useHapusSemuaAktivitas } from '../api'
import { AKSI_LABEL } from '../types'

export function AktivitasPanel() {
  const [page, setPage] = useState(1)
  const [konfirmasiHapusSemua, setKonfirmasiHapusSemua] = useState(false)
  const aktivitas = useAktivitas(page)
  const hapusSatu = useHapusAktivitas()
  const hapusSemua = useHapusSemuaAktivitas()

  const hapusItem = (id: number) => {
    const sisaDiHalaman = aktivitas.data?.items.length ?? 0
    hapusSatu.mutate(id, {
      onSuccess: () => {
        if (sisaDiHalaman <= 1 && page > 1) {
          setPage((p) => Math.max(1, p - 1))
        }
        toast.success('Riwayat aktivitas dihapus.')
      },
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  const konfirmasiBersihkan = () => {
    hapusSemua.mutate(undefined, {
      onSuccess: () => {
        setKonfirmasiHapusSemua(false)
        setPage(1)
        toast.success('Seluruh riwayat aktivitas berhasil dihapus.')
      },
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  const infoOtomatis = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3">
      <div className="flex items-start gap-2.5 text-xs text-brand-900 sm:items-center sm:text-sm">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-700 sm:mt-0" aria-hidden />
        <span>
          Hanya aktivitas akun Anda sendiri. Pembersihan otomatis berjalan <strong>sebulan sekali</strong> (riwayat lebih dari 1 bulan dihapus otomatis).
        </span>
      </div>
      {(aktivitas.data?.total ?? 0) > 0 && (
        <Button
          variant="danger"
          onClick={() => setKonfirmasiHapusSemua(true)}
          disabled={hapusSemua.isPending}
          className="shrink-0"
        >
          <Trash2 className="size-4" aria-hidden /> Hapus Semua
        </Button>
      )}
    </div>
  )

  if (aktivitas.isPending) return <Spinner className="py-10" />
  if (aktivitas.isError) return <ErrorState message={errorMessage(aktivitas.error)} onRetry={() => void aktivitas.refetch()} />
  if (aktivitas.data.items.length === 0) {
    return (
      <div>
        {infoOtomatis}
        <EmptyState title="Belum ada aktivitas tercatat." />
      </div>
    )
  }

  return (
    <div className={aktivitas.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {infoOtomatis}

      <ul className="space-y-2">
        {aktivitas.data.items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone="brand">{AKSI_LABEL[a.aksi]}</Badge>
                {a.hasil === 'gagal' && <Badge tone="danger">Gagal</Badge>}
              </div>
              <p className="text-sm text-slate-800">{a.deskripsi}</p>
              {a.ipAddress && <p className="text-xs text-slate-500">IP {a.ipAddress}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <time dateTime={a.waktu} className="text-xs text-slate-500">
                {formatTanggal(a.waktu)}
              </time>
              <button
                type="button"
                onClick={() => hapusItem(a.id)}
                disabled={hapusSatu.isPending && hapusSatu.variables === a.id}
                aria-label={`Hapus riwayat ${a.deskripsi}`}
                title="Hapus riwayat ini"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={aktivitas.data.page} totalPages={aktivitas.data.totalPages} onChange={setPage} />

      <Dialog open={konfirmasiHapusSemua} onClose={() => setKonfirmasiHapusSemua(false)} title="Hapus semua riwayat aktivitas?">
        <p className="text-sm leading-relaxed text-slate-600">
          Seluruh catatan riwayat aktivitas pada akun Anda akan dihapus dari tampilan profil. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setKonfirmasiHapusSemua(false)} disabled={hapusSemua.isPending}>
            Batal
          </Button>
          <Button variant="danger" onClick={konfirmasiBersihkan} disabled={hapusSemua.isPending}>
            {hapusSemua.isPending ? 'Menghapus…' : 'Ya, Hapus Semua'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
