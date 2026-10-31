import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { formatTanggalSingkat } from '@/lib/format'
import { JENIS_LABEL, KATEGORI_LABEL, type Flowchart } from '../types'
import { StatusFlowchartBadge } from './StatusFlowchartBadge'

export function FlowchartCard({ flowchart: f, tampilkanInstansi }: { flowchart: Flowchart; tampilkanInstansi: boolean }) {
  return (
    <li className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{f.kode}</span>
        <Badge tone="brand">{KATEGORI_LABEL[f.kategori]}</Badge>
        <StatusFlowchartBadge status={f.status} />
      </div>

      <h2 className="font-semibold text-slate-900">
        <Link to={`/katalog/flowchart/${f.id}`} className="hover:text-brand-700">
          {f.nama}
        </Link>
      </h2>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{f.deskripsi || 'Belum ada deskripsi.'}</p>

      <dl className="mt-3 space-y-0.5 text-xs text-slate-500">
        <div className="flex gap-1">
          <dt className="sr-only">Jenis</dt>
          <dd>{JENIS_LABEL[f.jenis]} · v{f.versi}</dd>
        </div>
        {tampilkanInstansi && (
          <div className="flex gap-1">
            <dt className="sr-only">Instansi</dt>
            <dd>{f.instansi.nama}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
        <span>Diperbarui {formatTanggalSingkat(f.diperbaruiPada)}</span>
        <Link to={`/katalog/flowchart/${f.id}`} className="-my-1.5 py-1.5 font-semibold text-brand-700 hover:underline" aria-label={`Lihat detail ${f.nama}`}>
          Lihat detail
        </Link>
      </div>
    </li>
  )
}
