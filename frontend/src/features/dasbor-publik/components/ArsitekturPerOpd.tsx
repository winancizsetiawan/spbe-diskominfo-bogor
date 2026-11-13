import { useEffect, useState } from 'react'
import { formatAngka } from '@/lib/format'
import type { ArsitekturOpd } from '../types'

// Empat domain dalam satu keluarga biru merek, dari pekat ke muda (DESIGN.md 6.3: tanpa warna pelangi).
const DOMAIN = [
  { kunci: 'prosesBisnis', label: 'Proses bisnis', warna: '#1e2869' },
  { kunci: 'layanan', label: 'Layanan', warna: '#3b4fc4' },
  { kunci: 'data', label: 'Data', warna: '#8b9be6' },
  { kunci: 'aplikasi', label: 'Aplikasi', warna: '#c7cff3' },
] as const

const total = (o: ArsitekturOpd) => o.prosesBisnis + o.layanan + o.data + o.aplikasi

/**
 * Batang bertumpuk mendatar: satu baris per OPD, segmen per domain arsitektur, total tertulis di kanan.
 * Rincian per domain ada di tabel tersembunyi untuk pembaca layar dan di tooltip tiap segmen.
 */
export function ArsitekturPerOpd({ data, batas = 10 }: { data: ArsitekturOpd[]; batas?: number }) {
  const [penuh, setPenuh] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setPenuh(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const baris = data.slice(0, batas)
  const maks = Math.max(1, ...baris.map(total))

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-700" aria-label="Keterangan warna">
        {DOMAIN.map((d) => (
          <li key={d.kunci} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: d.warna }} aria-hidden />
            {d.label}
          </li>
        ))}
      </ul>

      <ol className="space-y-3" aria-hidden>
        {baris.map((o) => (
          <li key={o.opd} className="grid grid-cols-[minmax(0,7rem)_1fr_3rem] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_3.5rem]">
            <span className="truncate text-sm font-medium text-slate-800" title={o.opd}>
              {o.akronim || o.opd}
            </span>
            <div className="h-5 rounded-md bg-slate-100">
              <div
                className="flex h-5 gap-px overflow-hidden rounded-md transition-[width] duration-700 ease-out"
                style={{ width: penuh ? `${(total(o) / maks) * 100}%` : '0%' }}
              >
                {DOMAIN.map((d) =>
                  o[d.kunci] > 0 ? (
                    <div
                      key={d.kunci}
                      className="h-full"
                      style={{ flexGrow: o[d.kunci], background: d.warna }}
                      title={`${o.opd} · ${d.label}: ${formatAngka(o[d.kunci])}`}
                    />
                  ) : null,
                )}
              </div>
            </div>
            <span className="text-right text-sm font-semibold text-slate-900 tabular-nums">{formatAngka(total(o))}</span>
          </li>
        ))}
      </ol>

      <div className="sr-only">
        <table>
          <caption>Jumlah proses bisnis, layanan, data, dan aplikasi per OPD, {baris.length} teratas</caption>
          <thead>
            <tr>
              <th scope="col">OPD</th>
              {DOMAIN.map((d) => (
                <th key={d.kunci} scope="col">
                  {d.label}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((o) => (
              <tr key={o.opd}>
                <th scope="row">{o.opd}</th>
                {DOMAIN.map((d) => (
                  <td key={d.kunci}>{o[d.kunci]}</td>
                ))}
                <td>{total(o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
