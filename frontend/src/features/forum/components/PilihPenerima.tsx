import { Search, UserPlus, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { inputClass } from '@/components/ui/Field'
import { useCariPengguna } from '../api'
import { BATAS, type PenggunaForum } from '../types'

interface Props {
  id: string
  value: PenggunaForum[]
  onChange(penerima: PenggunaForum[]): void
  /** false di dalam dialog: daftar hasil ikut alur halaman agar tidak terpotong. */
  mengambang?: boolean
}

/** Cari dan pilih pengguna yang ditugaskan menjawab thread (maksimal BATAS.penerimaMax). */
export function PilihPenerima({ id, value, onChange, mengambang = true }: Props) {
  const [ketik, setKetik] = useState('')
  const [q, setQ] = useState('')
  const [buka, setBuka] = useState(false)
  const idDaftar = useId()

  // Tunda pencarian sedikit agar tidak memanggil API di tiap ketukan.
  useEffect(() => {
    const t = setTimeout(() => setQ(ketik.trim()), 250)
    return () => clearTimeout(t)
  }, [ketik])

  const cari = useCariPengguna(q)
  const terpilih = new Set(value.map((p) => p.id))
  const hasil = (cari.data ?? []).filter((p) => !terpilih.has(p.id))
  const penuh = value.length >= BATAS.penerimaMax

  const tambah = (p: PenggunaForum) => {
    onChange([...value, p])
    setKetik('')
    setBuka(false)
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm text-brand-800">
              <span>
                {p.nama} <span className="text-brand-600">· {p.instansi}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== p.id))}
                aria-label={`Hapus ${p.nama} dari penerima`}
                className="rounded-full p-1 hover:bg-brand-100"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={buka && !penuh}
          aria-controls={idDaftar}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={penuh}
          placeholder={penuh ? `Sudah ${BATAS.penerimaMax} penerima` : 'Cari nama atau instansi…'}
          value={ketik}
          onChange={(e) => {
            setKetik(e.target.value)
            setBuka(true)
          }}
          onFocus={() => setBuka(true)}
          onBlur={() => setTimeout(() => setBuka(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setBuka(false)
            if (e.key === 'Enter') {
              e.preventDefault()
              if (hasil[0]) tambah(hasil[0])
            }
          }}
          className={`${inputClass} pl-9`}
        />
        {buka && !penuh && (
          <ul
            id={idDaftar}
            role="listbox"
            className={`${mengambang ? 'absolute z-20 shadow-lg' : ''} mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1`}
          >
            {cari.isPending ? (
              <li className="px-3 py-2 text-sm text-slate-500">Memuat…</li>
            ) : hasil.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">Tidak ada pengguna yang cocok.</li>
            ) : (
              hasil.map((p) => (
                <li key={p.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => tambah(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <UserPlus className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="font-medium text-slate-800">{p.nama}</span>
                    <span className="truncate text-slate-500">· {p.instansi}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
