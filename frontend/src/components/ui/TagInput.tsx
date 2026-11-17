import { X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { inputClass } from './Field'

interface Props {
  id: string
  value: string[]
  onChange(value: string[]): void
  placeholder?: string
  maksimal?: number
  maksPanjang?: number
  disabled?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Isian beberapa nilai: ketik lalu Enter atau koma. Nilai kembar (tanpa beda huruf) diabaikan. */
export function TagInput({ id, value, onChange, placeholder, maksimal = 10, maksPanjang = 100, disabled, ...aria }: Props) {
  const [teks, setTeks] = useState('')

  // Koma memisahkan nilai, jadi teks tempelan "a, b" menjadi dua tag.
  const tambah = (mentah: string) => {
    const baru = [...value]
    for (const bagian of mentah.split(',')) {
      const v = bagian.trim().slice(0, maksPanjang)
      if (!v || baru.length >= maksimal) continue
      if (baru.some((x) => x.toLowerCase() === v.toLowerCase())) continue
      baru.push(v)
    }
    if (baru.length !== value.length) onChange(baru)
  }

  const tekan = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      tambah(teks)
      setTeks('')
    } else if (e.key === 'Backspace' && !teks && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={`${inputClass} flex flex-wrap items-center gap-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100`}>
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {v}
          {!disabled && (
            <button
              type="button"
              aria-label={`Hapus ${v}`}
              className="rounded text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-500"
              onClick={() => onChange(value.filter((x) => x !== v))}
            >
              <X className="size-3" aria-hidden />
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        value={teks}
        disabled={disabled || value.length >= maksimal}
        placeholder={value.length >= maksimal ? undefined : placeholder}
        onChange={(e) => setTeks(e.target.value)}
        onKeyDown={tekan}
        onBlur={() => {
          tambah(teks)
          setTeks('')
        }}
        autoComplete="off"
        className="min-w-32 flex-1 border-0 bg-transparent p-0 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
        {...aria}
      />
    </div>
  )
}
