import { BarChart3, FileText, ListChecks, MessagesSquare } from 'lucide-react'
import { Link } from 'react-router'
import { DokumenRow } from '@/features/dokumen/components/DokumenRow'
import { ThreadCard } from '@/features/forum/components/ThreadCard'
import { AksesCepat } from '../components/AksesCepat'
import { NotifikasiRingkas } from '../components/NotifikasiRingkas'
import { Panel } from '../components/Panel'
import type { BerandaInternal } from '../types'

export function InternalView({ data }: { data: BerandaInternal }) {
  return (
    <div className="space-y-8">
      <AksesCepat
        item={[
          { ikon: FileText, label: 'Cari Dokumen', to: '/dokumen' },
          { ikon: ListChecks, label: 'Lihat SOP', to: '/sop' },
          { ikon: MessagesSquare, label: 'Forum Diskusi', to: '/forum' },
          { ikon: BarChart3, label: 'Dasbor Analitik', to: '/dasbor/analitik' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Dokumen dan panduan terbaru" tautan={{ to: '/dokumen', label: 'Semua dokumen' }} className="lg:col-span-2">
          {data.dokumenTerbaru.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada dokumen.</p>
          ) : (
            <ul className="space-y-3">
              {data.dokumenTerbaru.map((d) => (
                <DokumenRow key={d.id} dokumen={d} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <NotifikasiRingkas notifikasi={data.notifikasi} belumDibaca={data.belumDibaca} />
        </div>
      </div>

      <section aria-labelledby="thread-populer">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="thread-populer" className="text-lg font-semibold text-slate-900">
            Thread populer
          </h2>
          <Link to="/forum" className="text-sm font-medium text-brand-700 hover:underline">
            Buka forum
          </Link>
        </div>
        {data.threadPopuler.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada diskusi.</p>
        ) : (
          <ul className="space-y-3">
            {data.threadPopuler.map((t) => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
