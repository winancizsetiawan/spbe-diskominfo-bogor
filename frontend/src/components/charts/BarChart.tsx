import { batasAtas } from './warna'

export interface SeriBatang {
  kunci: string
  label: string
  warna: string
}

type Baris = { label: string } & Record<string, number | string>

interface Props {
  data: Baris[]
  series: SeriBatang[]
  /** Deskripsi grafik untuk pembaca layar dan judul tabel data. */
  label: string
}

const L = 480
const T = 200
const KIRI = 30
const BAWAH = 26
const ATAS = 10

/** Diagram batang berkelompok dengan legenda dan tabel data tersembunyi. */
export function BarChart({ data, series, label }: Props) {
  const nilai = (b: Baris, s: SeriBatang) => Number(b[s.kunci]) || 0
  const maks = batasAtas(Math.max(0, ...data.flatMap((b) => series.map((s) => nilai(b, s)))))
  const lebarDalam = L - KIRI - 8
  const tinggiDalam = T - ATAS - BAWAH
  const lebarGrup = data.length > 0 ? lebarDalam / data.length : lebarDalam
  const lebarBatang = (lebarGrup * 0.72) / series.length

  return (
    <div>
      <svg viewBox={`0 0 ${L} ${T}`} role="img" aria-label={label} className="h-auto w-full">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = ATAS + tinggiDalam - (i / 4) * tinggiDalam
          return (
            <g key={i}>
              <line x1={KIRI} x2={L - 8} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={KIRI - 6} y={y} textAnchor="end" dominantBaseline="central" className="fill-slate-500 text-[10px]">
                {(i / 4) * maks}
              </text>
            </g>
          )
        })}
        {data.map((b, gi) => {
          const x0 = KIRI + gi * lebarGrup + (lebarGrup - lebarBatang * series.length) / 2
          return (
            <g key={b.label}>
              {series.map((s, si) => {
                const tinggi = (nilai(b, s) / maks) * tinggiDalam
                return (
                  <rect
                    key={s.kunci}
                    x={x0 + si * lebarBatang}
                    y={ATAS + tinggiDalam - tinggi}
                    width={Math.max(lebarBatang - 1, 1)}
                    height={tinggi}
                    rx="2"
                    fill={s.warna}
                  />
                )
              })}
              <text x={KIRI + gi * lebarGrup + lebarGrup / 2} y={T - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {series.map((s) => (
          <li key={s.kunci} className="flex items-center gap-2 text-slate-700">
            <span aria-hidden className="size-3 rounded-sm" style={{ backgroundColor: s.warna }} />
            {s.label}
          </li>
        ))}
      </ul>

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Periode</th>
            {series.map((s) => (
              <th key={s.kunci} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((b) => (
            <tr key={b.label}>
              <th scope="row">{b.label}</th>
              {series.map((s) => (
                <td key={s.kunci}>{nilai(b, s)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
