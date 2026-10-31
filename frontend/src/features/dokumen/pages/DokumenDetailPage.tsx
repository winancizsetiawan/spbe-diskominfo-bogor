import { ArrowLeft, Lock } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage, isStatus } from '@/lib/errors'
import { formatAngka, formatTanggalSingkat, formatUkuran } from '@/lib/format'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useDokumen } from '../api'
import { BerkasIcon } from '../components/BerkasIcon'
import { UnduhButton } from '../components/UnduhButton'
import { JENIS_LABEL, STATUS_LABEL } from '../types'

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 sm:col-span-2">{children}</dd>
    </div>
  )
}

export function DokumenDetailPage() {
  const id = Number(useParams().id)
  const dokumen = useDokumen(id)

  if (!Number.isInteger(id) || id <= 0 || isStatus(dokumen.error, 404)) return <NotFoundPage />
  if (isStatus(dokumen.error, 403)) return <ForbiddenPage />
  if (isStatus(dokumen.error, 401)) {
    // Dokumen internal dibuka tanpa login: arahkan masuk lalu kembali ke sini.
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Lock className="mx-auto size-10 text-slate-400" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Dokumen internal</h1>
        <p className="mt-2 text-sm text-slate-600">Masuk dengan akun SSO Anda untuk melihat dan mengunduh dokumen ini.</p>
        <Link to={`/masuk?kembali=${encodeURIComponent(`/dokumen/${id}`)}`} className={buttonClass('primary', 'mt-6')}>
          Masuk
        </Link>
      </div>
    )
  }
  if (dokumen.isPending) return <Spinner className="py-24" />
  if (dokumen.isError) return <ErrorState message={errorMessage(dokumen.error)} onRetry={() => void dokumen.refetch()} />

  const d = dokumen.data
  const daftarPath = d.jenis === 'sop' ? '/sop' : '/dokumen'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to={daftarPath} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke {d.jenis === 'sop' ? 'daftar SOP' : 'daftar dokumen'}
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-4">
          <BerkasIcon tipe={d.tipeBerkas} className="size-14 text-sm" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{d.kategori?.nama ?? JENIS_LABEL[d.jenis]}</Badge>
              <Badge tone={d.status === 'berlaku' ? 'success' : 'warning'}>{STATUS_LABEL[d.status]}</Badge>
              {d.visibilitas === 'internal' && <Badge>Internal</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{d.judul}</h1>
          </div>
          <UnduhButton id={d.id} judul={d.judul} />
        </div>

        <p className="mt-5 text-slate-700">{d.deskripsi}</p>

        <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
          <Baris label="Jenis">{JENIS_LABEL[d.jenis]}</Baris>
          {d.kategori && <Baris label="Kategori">{d.kategori.nama}</Baris>}
          <Baris label="Versi">{d.versi}</Baris>
          <Baris label="Sumber">{d.sumber ?? <span className="text-slate-500 italic">Tidak dicantumkan</span>}</Baris>
          <Baris label="Berkas">
            <span className="uppercase">{d.tipeBerkas}</span> · {formatUkuran(d.ukuranMb)}
          </Baris>
          <Baris label="Tanggal rilis">
            <time dateTime={d.tanggalRilis}>{formatTanggalSingkat(d.tanggalRilis)}</time>
          </Baris>
          <Baris label="Diunduh">{formatAngka(d.jumlahUnduhan)} kali</Baris>
        </dl>

        {d.status === 'review' && (
          <p role="note" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Dokumen ini sedang dalam siklus review. Isinya dapat berubah sebelum berstatus Berlaku.
          </p>
        )}
      </Card>
    </div>
  )
}
