import { batasAtas } from './warna'

export interface SeriGaris {
  kunci: string
  label: string
  warna: string
  /** Pola garis putus-putus agar seri terbedakan tanpa warna, mis. "4 3". */
  pola?: string
}

type Titik = { label: string } & Record<string, number | string>

interface Props {
  data: Titik[]
  series: SeriGaris[]
  label: string
}

const L = 480
const T = 200
const KIRI = 30
const BAWAH = 26
const ATAS = 10

/** Diagram garis multiseri dengan legenda dan tabel data tersembunyi. */
export function LineChart({ data, series, label }: Props) {
  const nilai = (t: Titik, s: SeriGaris) => Number(t[s.kunci]) || 0
  const maks = batasAtas(Math.max(0, ...data.flatMap((t) => series.map((s) => nilai(t, s)))))
  const lebarDalam = L - KIRI - 12
  const tinggiDalam = T - ATAS - BAWAH
  const langkah = data.length > 1 ? lebarDalam / (data.length - 1) : 0
  const x = (i: number) => KIRI + i * langkah
  const y = (v: number) => ATAS + tinggiDalam - (v / maks) * tinggiDalam
  // Label sumbu x tidak ditampilkan semua agar tidak bertumpuk.
  const setiap = Math.max(1, Math.ceil(data.length / 6))

  return (
    <div>
      <svg viewBox={`0 0 ${L} ${T}`} role="img" aria-label={label} className="h-auto w-full">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={KIRI} x2={L - 12} y1={y((i / 4) * maks)} y2={y((i / 4) * maks)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={KIRI - 6} y={y((i / 4) * maks)} textAnchor="end" dominantBaseline="central" className="fill-slate-500 text-[10px]">
              {(i / 4) * maks}
            </text>
          </g>
        ))}
        {data.map((t, i) =>
          i % setiap === 0 || i === data.length - 1 ? (
            <text key={t.label} x={x(i)} y={T - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">
              {t.label}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.kunci}>
            <polyline
              fill="none"
              stroke={s.warna}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.pola}
              points={data.map((t, i) => `${x(i)},${y(nilai(t, s))}`).join(' ')}
            />
            {data.map((t, i) =>
              nilai(t, s) > 0 ? <circle key={t.label} cx={x(i)} cy={y(nilai(t, s))} r="2.5" fill={s.warna} /> : null,
            )}
          </g>
        ))}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {series.map((s) => (
          <li key={s.kunci} className="flex items-center gap-2 text-slate-700">
            <svg width="22" height="8" aria-hidden>
              <line x1="0" y1="4" x2="22" y2="4" stroke={s.warna} strokeWidth="2" strokeDasharray={s.pola} />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>

      {/* Pembungkus div yang dipotong; tabel yang di-sr-only langsung tetap melebarkan halaman melewati footer. */}
      <div className="sr-only">
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            {series.map((s) => (
              <th key={s.kunci} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={t.label}>
              <th scope="row">{t.label}</th>
              {series.map((s) => (
                <td key={s.kunci}>{nilai(t, s)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
