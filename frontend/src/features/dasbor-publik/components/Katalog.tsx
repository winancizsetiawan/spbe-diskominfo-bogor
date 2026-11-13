import { Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { inputClass } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatAngka } from '@/lib/format'

export interface KolomKatalog<T> {
  kunci: keyof T & string
  label: string
  /** Kolom utama tampil tebal. */
  utama?: boolean
  kelas?: string
}

interface Props<T extends { [K in keyof T]: string | undefined }> {
  id: string
  judul: string
  data: T[]
  kolom: KolomKatalog<T>[]
  /** Kolom untuk filter pilihan (mis. unit pelaksana). */
  filter?: { kunci: keyof T & string; label: string }
  keterangan?: ReactNode
}

const PER_HALAMAN = 10

/** Katalog dengan pencarian teks, satu filter pilihan, dan halaman; semua di sisi klien karena datanya kecil. */
export function Katalog<T extends { [K in keyof T]: string | undefined }>({ id, judul, data, kolom, filter, keterangan }: Props<T>) {
  const [q, setQ] = useState('')
  const [pilihan, setPilihan] = useState('')
  const [page, setPage] = useState(1)

  const opsi = useMemo(
    () =>
      filter
        ? [...new Set(data.map((d): string => d[filter.kunci] ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'))
        : [],
    [data, filter],
  )
  const hasil = useMemo(() => {
    const kata = q.trim().toLowerCase()
    return data.filter(
      (d) => (!pilihan || (filter && d[filter.kunci] === pilihan)) && (!kata || kolom.some((k) => d[k.kunci]?.toLowerCase().includes(kata))),
    )
  }, [data, q, pilihan, filter, kolom])
  const totalPages = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN))
  const halaman = Math.min(page, totalPages)
  const baris = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN)

  return (
    <section aria-labelledby={`${id}-judul`} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id={`${id}-judul`} className="font-semibold text-slate-900">
            {judul}
          </h3>
          {keterangan && <p className="mt-0.5 text-sm text-slate-600">{keterangan}</p>}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative min-w-56 flex-1">
            <label htmlFor={`${id}-cari`} className="sr-only">
              Cari di {judul.toLowerCase()}
            </label>
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              id={`${id}-cari`}
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Cari…"
              className={`${inputClass} pl-9`}
            />
          </div>
          {filter && (
            <div className="w-full sm:w-64">
              <label htmlFor={`${id}-filter`} className="sr-only">
                {filter.label}
              </label>
              <select
                id={`${id}-filter`}
                value={pilihan}
                onChange={(e) => {
                  setPilihan(e.target.value)
                  setPage(1)
                }}
                className={inputClass}
              >
                <option value="">Semua {filter.label.toLowerCase()}</option>
                {opsi.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600" aria-live="polite">
        {formatAngka(hasil.length)} dari {formatAngka(data.length)} baris
      </p>

      <Table caption={judul}>
        <thead>
          <tr>
            {kolom.map((k) => (
              <Th key={k.kunci} className={k.kelas}>
                {k.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map((d, i) => (
            <tr key={`${d[kolom[0].kunci]}-${i}`}>
              {kolom.map((k) => (
                <Td key={k.kunci} className={`align-top ${k.utama ? 'font-medium text-slate-900' : 'text-slate-700'} ${k.kelas ?? ''}`}>
                  {d[k.kunci] || <span className="text-slate-500">–</span>}
                </Td>
              ))}
            </tr>
          ))}
          {baris.length === 0 && (
            <tr>
              <Td colSpan={kolom.length} className="py-8 text-center text-slate-600">
                Tidak ada baris yang cocok.
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
      <Pagination page={halaman} totalPages={totalPages} onChange={setPage} />
    </section>
  )
}
