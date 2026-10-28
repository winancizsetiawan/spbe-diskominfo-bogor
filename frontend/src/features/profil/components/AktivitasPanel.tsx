import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { formatTanggal } from '@/lib/format'
import { useAktivitas } from '../api'
import { AKSI_LABEL } from '../types'

export function AktivitasPanel() {
  const [page, setPage] = useState(1)
  const aktivitas = useAktivitas(page)

  if (aktivitas.isPending) return <Spinner className="py-10" />
  if (aktivitas.isError) return <ErrorState message={errorMessage(aktivitas.error)} onRetry={() => void aktivitas.refetch()} />
  if (aktivitas.data.items.length === 0) return <EmptyState title="Belum ada aktivitas tercatat." />

  return (
    <div className={aktivitas.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <p className="mb-3 text-sm text-slate-500">
        Hanya aktivitas akun Anda sendiri. Data sensitif seperti kata sandi tidak pernah dicatat.
      </p>
      <ul className="space-y-2">
        {aktivitas.data.items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone="brand">{AKSI_LABEL[a.aksi]}</Badge>
                {a.hasil === 'gagal' && <Badge tone="danger">Gagal</Badge>}
              </div>
              <p className="text-sm text-slate-800">{a.deskripsi}</p>
              {a.ipAddress && <p className="text-xs text-slate-500">IP {a.ipAddress}</p>}
            </div>
            <time dateTime={a.waktu} className="shrink-0 text-xs text-slate-500">
              {formatTanggal(a.waktu)}
            </time>
          </li>
        ))}
      </ul>
      <Pagination page={aktivitas.data.page} totalPages={aktivitas.data.totalPages} onChange={setPage} />
    </div>
  )
}
