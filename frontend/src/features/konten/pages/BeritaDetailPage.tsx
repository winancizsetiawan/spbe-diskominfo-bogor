import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { formatAngka, formatTanggalSingkat } from '@/lib/format'
import { useArtikel } from '../api'
import { JENIS_LABEL } from '../types'

export function BeritaDetailPage() {
  const { id } = useParams()
  const artikel = useArtikel(Number(id))

  if (artikel.isPending) return <Spinner className="py-16" />
  if (artikel.isError) return <ErrorState message={errorMessage(artikel.error)} onRetry={() => void artikel.refetch()} />
  const a = artikel.data

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/berita" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke Berita & Artikel
      </Link>
      <Badge tone={a.jenis === 'berita' ? 'brand' : 'neutral'}>{JENIS_LABEL[a.jenis]}</Badge>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{a.judul}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {formatTanggalSingkat(a.tanggal)} · {a.penulis} · {formatAngka(a.views)} kali dibaca
      </p>
      <div className="mt-6 space-y-4 text-slate-700">
        {a.konten.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  )
}
