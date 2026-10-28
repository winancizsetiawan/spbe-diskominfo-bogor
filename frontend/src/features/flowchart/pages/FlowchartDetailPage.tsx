import { AlertTriangle, ArrowLeft, Download, History, Pencil, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage, isStatus } from '@/lib/errors'
import { formatTanggal } from '@/lib/format'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useFlowchart } from '../api'
import { AjukanFlowchartDialog } from '../components/AjukanFlowchartDialog'
import { DiagramPanel } from '../components/DiagramPanel'
import { StatusFlowchartBadge } from '../components/StatusFlowchartBadge'
import { BISA_DIAJUKAN_FLOWCHART, JENIS_LABEL, KATEGORI_LABEL } from '../types'

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 sm:col-span-2">{children}</dd>
    </div>
  )
}

function unduhXml(xml: string, nama: string) {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function FlowchartDetailPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const flowchart = useFlowchart(id)
  const [ajukan, setAjukan] = useState(false)

  if (!Number.isInteger(id) || id <= 0 || isStatus(flowchart.error, 404)) return <NotFoundPage />
  if (isStatus(flowchart.error, 403)) return <ForbiddenPage />
  if (flowchart.isPending) return <Spinner className="py-24" />
  if (flowchart.isError) return <ErrorState message={errorMessage(flowchart.error)} onRetry={() => void flowchart.refetch()} />

  const f = flowchart.data
  const menunggu = f.status === 'menunggu'
  const bisaUbah = !menunggu
  const bisaAjukan = user?.role === 'admin_opd' && BISA_DIAJUKAN_FLOWCHART.includes(f.status)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/katalog/flowchart" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke daftar flowchart
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{f.kode}</span>
            <Badge tone="brand">{KATEGORI_LABEL[f.kategori]}</Badge>
            <StatusFlowchartBadge status={f.status} />
            <span className="text-xs text-slate-500">v{f.versi}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{f.nama}</h1>
          {f.deskripsi && <p className="mt-1 max-w-2xl text-sm text-slate-600">{f.deskripsi}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => unduhXml(f.bpmnXml, `${f.kode}-v${f.versi}.bpmn`)}>
            <Download className="size-4" aria-hidden /> Unduh BPMN
          </Button>
          {bisaUbah && (
            <Link to={`/katalog/flowchart/${f.id}/ubah`} className={buttonClass('secondary')}>
              <Pencil className="size-4" aria-hidden /> Edit
            </Link>
          )}
          {bisaAjukan && (
            <Button onClick={() => setAjukan(true)}>
              <Send className="size-4" aria-hidden /> Ajukan Validasi
            </Button>
          )}
        </div>
      </div>

      {f.catatanValidasi && (
        <p role="note" className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Catatan validator:</span> {f.catatanValidasi}
          </span>
        </p>
      )}
      {menunggu && (
        <p role="status" className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Flowchart ini sedang menunggu keputusan Super Admin dan tidak dapat diubah.
        </p>
      )}

      <Card className="p-5">
        <DiagramPanel id={f.id} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Informasi proses</h2>
          <dl className="mt-2 divide-y divide-slate-100">
            <Baris label="Penanggung jawab (PIC)">{f.pic}</Baris>
            <Baris label="Instansi">{f.instansi.nama}</Baris>
            <Baris label="Jenis">{JENIS_LABEL[f.jenis]}</Baris>
            <Baris label="Diperbarui">{formatTanggal(f.diperbaruiPada)}</Baris>
            <Baris label="Aplikasi terkait">
              {f.aplikasi.length === 0 ? (
                <span className="text-slate-500 italic">Belum ada</span>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {f.aplikasi.map((a) => (
                    <li key={a.id}>
                      <Badge tone="brand">{a.nama}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Baris>
            <Baris label="SOP terkait">
              {f.sop.length === 0 ? (
                <span className="text-slate-500 italic">Belum ada</span>
              ) : (
                <ul className="space-y-1">
                  {f.sop.map((s) => (
                    <li key={s.id}>
                      <Link to={`/dokumen/${s.id}`} className="text-brand-700 hover:underline">
                        {s.judul}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Baris>
          </dl>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <History className="size-4" aria-hidden /> Riwayat revisi
          </h2>
          <ol className="mt-3 space-y-4">
            {f.riwayat.map((r, i) => (
              <li key={r.versi} className="border-l-2 border-slate-200 pl-3">
                <p className="text-sm font-semibold text-slate-800">
                  Versi {r.versi} {i === 0 && <span className="font-normal text-slate-500">(terbaru)</span>}
                </p>
                <p className="text-sm text-slate-600">{r.catatan}</p>
                <p className="text-xs text-slate-500">
                  {r.oleh} · {formatTanggal(r.tanggal)}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <AjukanFlowchartDialog flowchart={ajukan ? f : null} onClose={() => setAjukan(false)} />
    </div>
  )
}
