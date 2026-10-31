import { ArrowLeft, Award, CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { buttonClass } from '@/components/ui/Button'
import { errorMessage } from '@/lib/errors'
import { formatTanggalSingkat } from '@/lib/format'
import { useDetailKursus, useSelesaikanMateri } from '../api'
import { UnduhBukti } from '../components/UnduhBukti'
import { TIPE_MEDIA_LABEL, TINGKAT_LABEL } from '../types'

export function KursusDetailPage() {
  const id = Number(useParams().id)
  const kursus = useDetailKursus(id)
  const selesaikan = useSelesaikanMateri(id)

  if (kursus.isPending) return <Spinner className="py-16" />
  if (kursus.isError) return <ErrorState message={errorMessage(kursus.error)} onRetry={() => void kursus.refetch()} />
  const k = kursus.data

  const tandai = (idMateri: number) =>
    selesaikan.mutate(idMateri, {
      onSuccess: (d) => d.sertifikat && !k.sertifikat && toast.success('Kursus selesai. Bukti penyelesaian telah terbit.'),
      onError: (err) => toast.error(errorMessage(err)),
    })

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/pembelajaran" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke Pembelajaran
      </Link>
      <div className="mb-2 flex flex-wrap gap-2">
        <Badge tone="brand">{k.kategori}</Badge>
        <Badge>{TINGKAT_LABEL[k.tingkat]}</Badge>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{k.judul}</h1>
      <p className="mt-1 text-slate-600">{k.deskripsi}</p>
      <p className="mt-2 text-sm text-slate-500" aria-live="polite">
        {k.materiSelesai} dari {k.jumlahMateri} materi selesai ({k.persen}%)
      </p>

      {k.sertifikat && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <Award className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
          <div>
            <p className="font-semibold text-slate-900">Bukti penyelesaian</p>
            <p className="font-mono text-xs text-slate-600">{k.sertifikat.nomor}</p>
            <p className="text-xs text-slate-500">Terbit {formatTanggalSingkat(k.sertifikat.diterbitkanPada)}</p>
            <UnduhBukti sertifikat={k.sertifikat} />
          </div>
        </div>
      )}

      <ol className="mt-6 space-y-3">
        {k.materi.map((m, i) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            {m.selesai ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Selesai" /> : <Circle className="size-5 shrink-0 text-slate-300" aria-label="Belum selesai" />}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">
                {i + 1}. {m.judul}
              </p>
              <p className="text-xs text-slate-500">{TIPE_MEDIA_LABEL[m.tipe]}</p>
            </div>
            <a href={m.url} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'px-3 py-1.5 text-xs')}>
              Buka <ExternalLink className="ml-1 size-3.5" aria-hidden />
              <span className="sr-only">{m.judul} (tab baru)</span>
            </a>
            {!m.selesai && (
              <button type="button" className={buttonClass('primary', 'px-3 py-1.5 text-xs')} disabled={selesaikan.isPending} onClick={() => tandai(m.id)}>
                Tandai selesai
                <span className="sr-only"> {m.judul}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
      {!k.adaSertifikat && <p className="mt-4 text-xs text-slate-500">Kursus ini tidak menerbitkan bukti penyelesaian.</p>}
    </div>
  )
}
