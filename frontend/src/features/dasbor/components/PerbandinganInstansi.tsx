import { Card } from '@/components/ui/Card'
import type { DasborInstansi } from '../types'

/** Nilai instansi dibanding agregat kota untuk tiap indikator, dalam bar yang dilengkapi angka. */
export function PerbandinganInstansi({ data }: { data: DasborInstansi }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {data.indikator.map((i) => {
        const selisih = i.instansi - i.kota
        return (
          <Card key={i.kunci}>
            <h3 className="font-semibold text-slate-900">{i.label}</h3>
            <p className="text-xs text-slate-500">{i.keterangan}</p>

            <dl className="mt-4 space-y-3">
              {[
                { nama: data.instansi.nama, nilai: i.instansi, warna: 'bg-brand-600', rincian: `${i.pembilang} dari ${i.penyebut}` },
                { nama: 'Rata-rata kota', nilai: i.kota, warna: 'bg-slate-400', rincian: 'seluruh instansi' },
              ].map((b) => (
                <div key={b.nama}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <dt className="truncate text-slate-600">{b.nama}</dt>
                    <dd className="shrink-0 font-semibold text-slate-900 tabular-nums">
                      {b.nilai}% <span className="font-normal text-slate-500">({b.rincian})</span>
                    </dd>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${i.label}, ${b.nama}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={b.nilai}
                    className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                  >
                    <div className={`h-full rounded-full ${b.warna}`} style={{ width: `${b.nilai}%` }} />
                  </div>
                </div>
              ))}
            </dl>

            <p className={`mt-3 text-xs font-medium ${selisih > 0 ? 'text-emerald-700' : selisih < 0 ? 'text-amber-700' : 'text-slate-500'}`}>
              {selisih === 0 ? 'Sama dengan rata-rata kota' : `${Math.abs(selisih)} poin ${selisih > 0 ? 'di atas' : 'di bawah'} rata-rata kota`}
            </p>
          </Card>
        )
      })}
    </div>
  )
}
