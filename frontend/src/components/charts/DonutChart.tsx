export interface Irisan {
  label: string
  nilai: number
  warna: string
}

interface Props {
  data: Irisan[]
  /** Teks kecil di bawah total pada pusat donat. */
  pusat: string
  /** Deskripsi grafik untuk pembaca layar. */
  label: string
}

const R = 40
const KELILING = 2 * Math.PI * R

/** Donat statistik. Selalu disertai legenda berisi angka sehingga tidak bergantung pada warna. */
export function DonutChart({ data, pusat, label }: Props) {
  const total = data.reduce((jumlah, d) => jumlah + d.nilai, 0)
  const ringkasan = data.map((d) => `${d.label} ${d.nilai}`).join(', ')
  let geser = 0

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label}: ${ringkasan}`} className="size-36 shrink-0">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {total > 0 &&
          data
            .filter((d) => d.nilai > 0)
            .map((d) => {
              const panjang = (d.nilai / total) * KELILING
              const irisan = (
                <circle
                  key={d.label}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke={d.warna}
                  strokeWidth="14"
                  strokeDasharray={`${panjang} ${KELILING - panjang}`}
                  strokeDashoffset={-geser}
                  transform="rotate(-90 50 50)"
                />
              )
              geser += panjang
              return irisan
            })}
        <text x="50" y="48" textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-[18px] font-bold">
          {total}
        </text>
        <text x="50" y="64" textAnchor="middle" className="fill-slate-500 text-[7px]">
          {pusat}
        </text>
      </svg>

      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: d.warna }} />
            <span className="text-slate-700">{d.label}</span>
            <span className="font-semibold text-slate-900 tabular-nums">{d.nilai}</span>
            {total > 0 && <span className="text-xs text-slate-500">({Math.round((d.nilai / total) * 100)}%)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
