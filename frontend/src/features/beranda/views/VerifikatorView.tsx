import { BadgeCheck, FileText, MessagesSquare, Newspaper } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { useDaftarVerifikasiArtikel } from '@/features/konten/api'
import { JENIS_LABEL, STATUS_VERIFIKASI_ARTIKEL_LABEL } from '@/features/konten/types'
import { formatTanggalSingkat } from '@/lib/format'
import { AksesCepat } from '../components/AksesCepat'
import { NotifikasiRingkas } from '../components/NotifikasiRingkas'
import { Panel } from '../components/Panel'
import type { BerandaInternal } from '../types'

export function VerifikatorView({ data }: { data: BerandaInternal }) {
  const verif = useDaftarVerifikasiArtikel()
  const ringkasan = verif.data?.ringkasan
  const antrean = (verif.data?.items ?? []).filter((a) => (a.statusVerifikasi ?? 'terbit') !== 'terbit').slice(0, 5)

  return (
    <div className="space-y-8">
      <section aria-label="Ringkasan verifikasi konten" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Menunggu verifikasi"
          value={ringkasan?.menunggu ?? '–'}
          tone={(ringkasan?.menunggu ?? 0) > 0 ? 'warning' : 'neutral'}
          hint="Berita & artikel baru dari Super Admin"
        />
        <StatCard
          label="Sudah diterbitkan"
          value={ringkasan?.terbit ?? '–'}
          tone="success"
          hint="Telah disetujui & tayang"
        />
        <StatCard
          label="Perlu revisi"
          value={ringkasan?.revisi ?? '–'}
          tone={(ringkasan?.revisi ?? 0) > 0 ? 'danger' : 'neutral'}
          hint="Dikembalikan ke Super Admin"
        />
      </section>

      <AksesCepat
        item={[
          { ikon: BadgeCheck, label: 'Verifikasi Konten', to: '/verifikasi-konten' },
          { ikon: Newspaper, label: 'Berita & Artikel', to: '/berita' },
          { ikon: FileText, label: 'Dokumen SPBE', to: '/dokumen' },
          { ikon: MessagesSquare, label: 'Forum Diskusi', to: '/forum' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          judul="Antrean verifikasi berita & artikel"
          tautan={{ to: '/verifikasi-konten', label: 'Buka semua antrean' }}
          className="lg:col-span-2"
        >
          {antrean.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada berita atau artikel yang menunggu verifikasi saat ini.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {antrean.map((a) => {
                const st = a.statusVerifikasi ?? 'menunggu'
                return (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge tone={a.jenis === 'berita' ? 'brand' : 'neutral'}>{JENIS_LABEL[a.jenis]}</Badge>
                        <Badge tone={STATUS_VERIFIKASI_ARTIKEL_LABEL[st].tone}>
                          {STATUS_VERIFIKASI_ARTIKEL_LABEL[st].label}
                        </Badge>
                        <span className="text-xs text-slate-500">{formatTanggalSingkat(a.tanggal)}</span>
                      </div>
                      <p className="truncate font-semibold text-slate-900">{a.judul}</p>
                      <p className="truncate text-xs text-slate-500">{a.ringkasan}</p>
                    </div>
                    <Link to={`/berita/${a.id}`} className={buttonClass('secondary', 'h-8 px-3 py-0 text-xs')}>
                      Tinjau
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <NotifikasiRingkas notifikasi={data.notifikasi} belumDibaca={data.belumDibaca} />
        </div>
      </div>
    </div>
  )
}
