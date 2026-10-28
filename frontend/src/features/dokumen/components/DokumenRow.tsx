import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { formatAngka, formatTanggalSingkat, formatUkuran } from '@/lib/format'
import { JENIS_LABEL, type Dokumen } from '../types'
import { BerkasIcon } from './BerkasIcon'
import { UnduhButton } from './UnduhButton'

export function DokumenRow({ dokumen: d }: { dokumen: Dokumen }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200">
      <BerkasIcon tipe={d.tipeBerkas} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{d.kategori?.nama ?? JENIS_LABEL[d.jenis]}</Badge>
          {d.status === 'review' && <Badge tone="warning">Dalam review</Badge>}
          {d.visibilitas === 'internal' && <Badge>Internal</Badge>}
        </div>
        <Link to={`/dokumen/${d.id}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">
          {d.judul}
        </Link>
        <p className="mt-0.5 text-sm text-slate-500">
          <span className="uppercase">{d.tipeBerkas}</span> · {formatUkuran(d.ukuranMb)} · v{d.versi} ·{' '}
          {formatAngka(d.jumlahUnduhan)} unduhan · {formatTanggalSingkat(d.tanggalRilis)}
        </p>
      </div>
      <UnduhButton id={d.id} judul={d.judul} ringkas />
    </li>
  )
}
