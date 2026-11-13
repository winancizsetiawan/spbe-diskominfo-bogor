import { formatAngka } from '@/lib/format'
import type { Jumlah } from '../types'

// Satu keluarga biru merek agar tidak "pelangi" (DESIGN.md 6.3); kategori kecil/kosong memakai abu.
const WARNA = ['#1e2869', '#3b4fc4', '#8b9be6', '#c7cff3', '#94a3b8', '#cbd5e1']

interface Props {
  data: Jumlah[]
  /** Deskripsi untuk pembaca layar. */
  label: string
  /** Satuan total, mis. "layanan". */
  satuan: string
}

/** "RAA.02 APLIKASI KHUSUS" -> "Aplikasi Khusus" (kode disimpan terpisah). */
function rapikan(label: string) {
  const m = label.match(/^([A-Z]{2,4}(?:\.\d+)+)\s+(.*)$/)
  const nama = m ? m[2] : label
  return { kode: m?.[1] ?? '', nama: nama === nama.toUpperCase() ? nama.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : nama }
}

/**
 * Bar proporsi 100%: lebih mudah dibandingkan daripada sudut irisan donat.
 * Persentase ditulis besar di legenda, jadi bacaan tidak bergantung pada warna atau panjang segmen.
 */
export function ProporsiBar({ data, label, satuan }: Props) {
  const total = data.reduce((n, d) => n + d.nilai, 0)
  const persen = (n: number) => (total ? Math.round((n / total) * 100) : 0)

  return (
    <div>
      <p className="text-sm text-slate-600">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{formatAngka(total)}</span> {satuan}
      </p>
      <div className="mt-3 flex h-4 gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${persen(d.nilai)}%`).join(', ')}`}>
        {data.map((d, i) =>
          d.nilai > 0 ? (
            <div key={d.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(d.nilai / total) * 100}%`, background: WARNA[i % WARNA.length] }} />
          ) : null,
        )}
      </div>
      <ul className="mt-4 space-y-2.5">
        {data.map((d, i) => {
          const { kode, nama } = rapikan(d.label)
          return (
            <li key={d.label} className="flex items-center gap-3 text-sm">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: WARNA[i % WARNA.length] }} aria-hidden />
              <span className="min-w-0 flex-1 text-slate-700">
                {kode && <span className="mr-1.5 font-mono text-xs text-slate-500">{kode}</span>}
                {nama}
              </span>
              <span className="shrink-0 text-slate-600 tabular-nums">{formatAngka(d.nilai)}</span>
              <span className="w-12 shrink-0 text-right text-base font-semibold text-slate-900 tabular-nums">{persen(d.nilai)}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
