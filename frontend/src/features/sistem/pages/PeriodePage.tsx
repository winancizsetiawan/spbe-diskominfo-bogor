import { Bell, BellRing, Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { formatTanggalSingkat } from '@/lib/format'
import { usePeriode } from '../api'
import { HapusPeriodeDialog } from '../components/HapusPeriodeDialog'
import { PeriodeDialog, type TargetPeriode } from '../components/PeriodeDialog'
import { STATUS_PERIODE, type Periode } from '../types'

const tgl = (v: string) => formatTanggalSingkat(`${v}T00:00:00`)
const kecil = 'px-3 py-1.5 text-xs'

export function PeriodePage() {
  const periode = usePeriode()
  const [form, setForm] = useState<TargetPeriode | null>(null)
  const [hapus, setHapus] = useState<Periode | null>(null)

  const aktif = periode.data?.items.find((p) => p.status === 'berjalan')

  return (
    <>
      <PageHeader
        title="Periode Pembaruan Data"
        description="Tetapkan tenggat pembaruan data aplikasi dan arsitektur. Pengingat otomatis dikirim ke Admin OPD yang datanya belum disetujui."
        actions={
          <Button onClick={() => setForm({ periode: null })} disabled={!periode.data}>
            <Plus className="size-4" aria-hidden /> Tambah Periode
          </Button>
        }
      />

      {periode.isPending ? (
        <Spinner className="py-16" />
      ) : periode.isError ? (
        <ErrorState message={errorMessage(periode.error)} onRetry={() => void periode.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section aria-label="Daftar periode" className="space-y-3 lg:col-span-2">
            {periode.data.items.length === 0 ? (
              <EmptyState title="Belum ada periode.">Tambahkan periode agar pengingat tenggat dapat dikirim.</EmptyState>
            ) : (
              periode.data.items.map((p) => {
                const st = STATUS_PERIODE[p.status]
                return (
                  <Card key={p.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-slate-900">{p.nama}</h2>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {tgl(p.tanggalMulai)} – {tgl(p.tenggat)}
                        </p>
                        <p className="text-xs text-slate-500">Ditetapkan oleh {p.dibuatOleh}</p>
                      </div>
                      {p.status !== 'selesai' && (
                        <div className="flex gap-2">
                          <button type="button" className={buttonClass('secondary', kecil)} onClick={() => setForm({ periode: p })} aria-label={`Ubah ${p.nama}`}>
                            Ubah
                          </button>
                          <button type="button" className={buttonClass('ghost', `${kecil} text-red-600 hover:bg-red-50`)} onClick={() => setHapus(p)} aria-label={`Hapus ${p.nama}`}>
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                    <ul aria-label={`Jadwal pengingat ${p.nama}`} className="mt-4 flex flex-wrap gap-2">
                      {p.pengingat.map((r) => (
                        <li key={r.hariSebelum} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${r.terkirim ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {r.terkirim ? <BellRing className="size-3.5" aria-hidden /> : <Bell className="size-3.5" aria-hidden />}
                          <span>
                            H-{r.hariSebelum} · {tgl(r.tanggal)} · {r.terkirim ? 'Terkirim' : 'Dijadwalkan'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )
              })
            )}
          </section>

          <aside aria-labelledby="penerima-pengingat">
            <Card>
              <h2 id="penerima-pengingat" className="font-semibold text-slate-900">
                Penerima pengingat
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {aktif ? `Untuk periode ${aktif.nama}.` : 'Belum ada periode berjalan.'} Instansi dengan aplikasi yang belum berstatus Disetujui.
              </p>
              {periode.data.tertinggal.length === 0 ? (
                <p className="mt-3 text-sm text-emerald-700">Semua data instansi sudah disetujui.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {periode.data.tertinggal.map((t) => (
                    <li key={t.instansi} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-slate-700">{t.instansi}</span>
                      <Badge tone="warning">{t.jumlah} aplikasi</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      )}

      <PeriodeDialog target={form} semua={periode.data?.items ?? []} onClose={() => setForm(null)} />
      <HapusPeriodeDialog periode={hapus} onClose={() => setHapus(null)} />
    </>
  )
}
