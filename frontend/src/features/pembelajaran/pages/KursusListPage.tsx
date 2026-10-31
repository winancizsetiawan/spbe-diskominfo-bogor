import { Award, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { formatTanggalSingkat } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useKursus } from '../api'
import { UnduhBukti } from '../components/UnduhBukti'
import { TINGKAT_LABEL, type FilterTingkat } from '../types'

const TINGKAT = Object.keys(TINGKAT_LABEL) as FilterTingkat[]

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function KursusListPage() {
  const [params, ubahFilter] = useUrlFilter()
  const param = params.get('tingkat') as FilterTingkat | null
  const tingkat = param && TINGKAT.includes(param) ? param : 'semua'
  const kursus = useKursus()
  const tampil = kursus.data?.items.filter((k) => tingkat === 'semua' || k.tingkat === tingkat) ?? []

  return (
    <>
      <PageHeader title="Pembelajaran" description="Kursus mandiri seputar SPBE. Selesaikan semua materi untuk memperoleh bukti penyelesaian." />

      {kursus.isPending ? (
        <Spinner className="py-16" />
      ) : kursus.isError ? (
        <ErrorState message={errorMessage(kursus.error)} onRetry={() => void kursus.refetch()} />
      ) : (
        <div className="space-y-8">
          {kursus.data.sertifikat.length > 0 && (
            <section aria-labelledby="sertifikat-saya">
              <h2 id="sertifikat-saya" className="mb-3 text-lg font-semibold text-slate-900">Bukti penyelesaian saya</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {kursus.data.sertifikat.map((s) => (
                  <li key={s.nomor} className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <Award className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
                    <div>
                      <p className="font-semibold text-slate-900">{s.kursus}</p>
                      <p className="font-mono text-xs text-slate-600">{s.nomor}</p>
                      <p className="text-xs text-slate-500">{formatTanggalSingkat(s.diterbitkanPada)}</p>
                      <UnduhBukti sertifikat={s} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="daftar-kursus">
            <h2 id="daftar-kursus" className="sr-only">Daftar kursus</h2>
            <div role="group" aria-label="Filter tingkat" className="mb-4 flex flex-wrap gap-2">
              {TINGKAT.map((t) => (
                <button key={t} type="button" aria-pressed={tingkat === t} className={chipClass(tingkat === t)} onClick={() => ubahFilter({ tingkat: t === 'semua' ? undefined : t })}>
                  {TINGKAT_LABEL[t]}
                </button>
              ))}
            </div>
            {tampil.length === 0 ? (
              <EmptyState title="Tidak ada kursus pada tingkat ini." />
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tampil.map((k) => (
                  <li key={k.id}>
                    <Link to={`/pembelajaran/${k.id}`} className="block h-full">
                      <Card className="h-full transition hover:border-brand-200 hover:shadow-sm">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge tone="brand">{k.kategori}</Badge>
                          <Badge>{TINGKAT_LABEL[k.tingkat]}</Badge>
                          {k.persen === 100 && <Badge tone="success">Selesai</Badge>}
                        </div>
                        <h3 className="font-semibold text-slate-900">{k.judul}</h3>
                        <p className="mt-1 text-sm text-slate-600">{k.deskripsi}</p>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="size-3.5" aria-hidden /> {k.durasiJam} jam · {k.jumlahMateri} materi
                        </p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-label={`Progres ${k.judul}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={k.persen}>
                          <div className="h-full bg-brand-600" style={{ width: `${k.persen}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{k.persen}% selesai</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}
