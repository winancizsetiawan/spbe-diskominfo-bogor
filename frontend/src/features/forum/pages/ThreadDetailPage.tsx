import { ArrowLeft, Eye, Flag, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { errorMessage, isStatus } from '@/lib/errors'
import { formatAngka, formatTanggal } from '@/lib/format'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useNilaiBalasan, useThread } from '../api'
import { ReplyForm } from '../components/ReplyForm'
import { ReplyItem } from '../components/ReplyItem'
import { ReportDialog } from '../components/ReportDialog'
import type { LaporanInput } from '../types'

export function ThreadDetailPage() {
  const id = Number(useParams().id)
  const thread = useThread(id)
  const nilai = useNilaiBalasan(id)
  const [laporan, setLaporan] = useState<Pick<LaporanInput, 'targetTipe' | 'targetId'> | null>(null)

  if (!Number.isInteger(id) || id <= 0 || isStatus(thread.error, 404)) return <NotFoundPage />
  if (isStatus(thread.error, 403)) return <ForbiddenPage />
  if (thread.isPending) return <Spinner className="py-24" />
  if (thread.isError) return <ErrorState message={errorMessage(thread.error)} onRetry={() => void thread.refetch()} />

  const t = thread.data
  const aktif = t.status === 'aktif'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/forum" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke forum
      </Link>

      <Card className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{t.kategori.nama}</Badge>
          {t.status === 'terkunci' && (
            <Badge tone="warning">
              <Lock className="size-3" aria-hidden /> Terkunci
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t.judul}</h1>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{t.penulis.nama}</span> · {t.penulis.instansi} ·{' '}
          <time dateTime={t.dibuatPada}>{formatTanggal(t.dibuatPada)}</time>
        </p>
        <p className="mt-5 whitespace-pre-line text-slate-700">{t.konten}</p>
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Eye className="size-4" aria-hidden /> {formatAngka(t.dilihat)} kali dilihat
          </span>
          <button
            type="button"
            disabled={!aktif}
            onClick={() => setLaporan({ targetTipe: 'thread', targetId: t.id })}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flag className="size-4" aria-hidden /> Laporkan thread
          </button>
        </div>
      </Card>

      {!aktif && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Thread ini telah dikunci oleh moderator. Balasan, penilaian, dan laporan baru tidak dapat dikirim.
        </p>
      )}

      <section aria-labelledby="judul-balasan" className="space-y-3">
        <h2 id="judul-balasan" className="text-lg font-semibold text-slate-900">
          {t.jumlahBalasan} balasan
        </h2>
        {t.balasan.length === 0 ? (
          <EmptyState title="Belum ada balasan." />
        ) : (
          <ul className="space-y-3">
            {t.balasan.map((b) => (
              <ReplyItem
                key={b.id}
                balasan={b}
                interaktif={aktif}
                onNilai={() => nilai.mutate(b.id, { onError: (err) => toast.error(errorMessage(err)) })}
                onLaporkan={() => setLaporan({ targetTipe: 'balasan', targetId: b.id })}
              />
            ))}
          </ul>
        )}
      </section>

      {aktif && <ReplyForm threadId={t.id} />}

      <ReportDialog target={laporan} onClose={() => setLaporan(null)} />
    </div>
  )
}
