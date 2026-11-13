import { useEffect, useState } from 'react'
import { formatAngka } from '@/lib/format'
import type { Jumlah } from '../types'

interface Props {
  data: Jumlah[]
  /** Deskripsi untuk pembaca layar. */
  label: string
  /** Jumlah baris awal; sisanya bisa dibuka. */
  batas?: number
}

/** "RAB.09 PEMERINTAHAN UMUM" -> kode kecil + nama huruf kapital di awal kata agar mudah dibaca. */
function pecah(label: string) {
  const m = label.match(/^([A-Z]{2,4}(?:\.\d+)+)\s+(.*)$/)
  if (!m) return { kode: '', nama: label }
  const nama = m[2] === m[2].toUpperCase() ? m[2].toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : m[2]
  return { kode: m[1], nama }
}

/**
 * Batang peringkat mendatar: cocok untuk kategori berlabel panjang. Batang terbesar disorot dengan warna pekat
 * (DESIGN.md: satu batang yang disorot), sisanya lebih muda. Angka dan persentase selalu tertulis.
 */
export function BatangDatar({ data, label, batas = 8 }: Props) {
  const [semua, setSemua] = useState(false)
  // Batang tumbuh dari nol sekali saat tampil; preferensi "kurangi gerakan" mematikan transisinya (index.css).
  const [tampilPenuh, setTampilPenuh] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setTampilPenuh(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const maks = Math.max(1, ...data.map((d) => d.nilai))
  const total = data.reduce((n, d) => n + d.nilai, 0)
  const tampil = semua ? data : data.slice(0, batas)
  const sisa = data.length - tampil.length

  return (
    <div>
      <ul aria-label={label} className="space-y-3">
        {tampil.map((d, i) => {
          const { kode, nama } = pecah(d.label)
          const teratas = i === 0 && d.nilai === maks
          return (
            <li key={d.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 text-slate-700">
                  {kode && <span className="mr-1.5 font-mono text-xs text-slate-500">{kode}</span>}
                  {nama}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-slate-900">{formatAngka(d.nilai)}</span>
                  {total > 0 && <span className="ml-1.5 text-xs text-slate-500">{Math.round((d.nilai / total) * 100)}%</span>}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100" aria-hidden>
                <div
                  className={`h-2.5 rounded-full transition-[width] duration-700 ease-out ${teratas ? 'bg-brand-800' : 'bg-brand-500/70'}`}
                  style={{ width: tampilPenuh ? `${Math.max((d.nilai / maks) * 100, d.nilai > 0 ? 1.5 : 0)}%` : '0%' }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {data.length > batas && (
        <button type="button" onClick={() => setSemua((v) => !v)} className="mt-3 text-sm font-medium text-brand-700 hover:underline">
          {semua ? 'Tampilkan lebih sedikit' : `Tampilkan ${sisa} lainnya`}
        </button>
      )}
    </div>
  )
}
