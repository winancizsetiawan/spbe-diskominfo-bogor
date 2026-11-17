import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { ApiError } from '@/api/client'
import { errorMessage } from '@/lib/errors'
import { formatAngka, formatTanggalSingkat } from '@/lib/format'
import { useArtikel } from '../api'
import { FORMAT_LABEL, JENIS_LABEL, URL_LABEL } from '../types'

export function BeritaDetailPage() {
  const { id } = useParams()
  const artikel = useArtikel(Number(id))

  if (artikel.isPending) return <Spinner className="py-16" />
  if (artikel.error instanceof ApiError && artikel.error.status === 401) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Tulisan ini khusus pengguna yang sudah masuk</h1>
        <p className="mt-1 text-sm text-slate-600">Masuk untuk membacanya.</p>
        <Link to="/masuk" className="mt-4 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
          Masuk
        </Link>
      </div>
    )
  }
  if (artikel.isError) return <ErrorState message={errorMessage(artikel.error)} onRetry={() => void artikel.refetch()} />
  const a = artikel.data

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/berita" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke Berita & Artikel
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={a.jenis === 'berita' ? 'brand' : 'neutral'}>{JENIS_LABEL[a.jenis]}</Badge>
        {a.format !== 'teks' && <Badge tone="neutral">{FORMAT_LABEL[a.format]}</Badge>}
        {a.kategori && <span className="text-sm text-slate-600">{a.kategori}</span>}
        {a.statusAkses === 'internal' && <Badge tone="neutral">Internal</Badge>}
      </div>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{a.judul}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {formatTanggalSingkat(a.tanggal)} · {a.penulis} · {formatAngka(a.views)} kali dibaca
      </p>
      {a.kolaborator.length > 0 && <p className="mt-1 text-sm text-slate-600">Kolaborator: {a.kolaborator.join(', ')}</p>}
      {a.urlSumber && (
        <a href={a.urlSumber} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
          {URL_LABEL[a.format]} <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
      <div className="mt-6 space-y-4 text-slate-700">
        {a.konten.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {a.label.length > 0 && (
        <p className="mt-6 flex flex-wrap gap-1.5 text-xs text-slate-600">
          {a.label.map((l) => (
            <span key={l} className="rounded border border-slate-200 px-1.5 py-0.5">
              #{l}
            </span>
          ))}
        </p>
      )}
    </article>
  )
}
