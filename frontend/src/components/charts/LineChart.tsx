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
  /** Garis melengkung halus (kurva) alih-alih patah-patah. Tidak pernah melewati titik data atau turun di bawah nol. */
  halus?: boolean
  /** Arsir tipis di bawah setiap garis. */
  area?: boolean
}

type Xy = [number, number]

/**
 * Jalur kurva monoton (Fritsch–Carlson): melengkung halus di antara titik tetapi tidak "melambung"
 * melewati nilai sebenarnya, jadi data 0 tidak tergambar negatif.
 */
function jalurHalus(t: Xy[]) {
  if (t.length < 3) return `M${t.map((p) => p.join(',')).join(' L')}`
  const n = t.length
  const lebar = t.slice(0, -1).map((p, i) => t[i + 1][0] - p[0])
  const miring = t.slice(0, -1).map((p, i) => (t[i + 1][1] - p[1]) / lebar[i])
  const tangen = t.map((_, i) =>
    i === 0 ? miring[0] : i === n - 1 ? miring[n - 2] : miring[i - 1] * miring[i] <= 0 ? 0 : (miring[i - 1] + miring[i]) / 2,
  )
  miring.forEach((m, i) => {
    if (m === 0) {
      tangen[i] = 0
      tangen[i + 1] = 0
      return
    }
    const a = tangen[i] / m
    const b = tangen[i + 1] / m
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      tangen[i] = k * a * m
      tangen[i + 1] = k * b * m
    }
  })
  let d = `M${t[0][0]},${t[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = lebar[i] / 3
    d += ` C${t[i][0] + h},${t[i][1] + tangen[i] * h} ${t[i + 1][0] - h},${t[i + 1][1] - tangen[i + 1] * h} ${t[i + 1][0]},${t[i + 1][1]}`
  }
  return d
}

const L = 480
const T = 200
const KIRI = 30
const BAWAH = 26
const ATAS = 10

/** Diagram garis multiseri dengan legenda dan tabel data tersembunyi. */
export function LineChart({ data, series, label, halus = false, area = false }: Props) {
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
        {series.map((s) => {
          const titik: Xy[] = data.map((t, i) => [x(i), y(nilai(t, s))])
          const jalur = halus ? jalurHalus(titik) : `M${titik.map((p) => p.join(',')).join(' L')}`
          return (
          <g key={s.kunci}>
            {area && titik.length > 1 && (
              <path d={`${jalur} L${titik[titik.length - 1][0]},${y(0)} L${titik[0][0]},${y(0)} Z`} fill={s.warna} fillOpacity="0.08" stroke="none" />
            )}
            <path
              d={jalur}
              fill="none"
              stroke={s.warna}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.pola}
            />
            {data.map((t, i) =>
              nilai(t, s) > 0 ? <circle key={t.label} cx={x(i)} cy={y(nilai(t, s))} r="2.5" fill={s.warna} /> : null,
            )}
          </g>
          )
        })}
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
