import { FileUp, X } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { formatUkuran } from '@/lib/format'
import { BATAS_UNGGAH, TIPE_DIIZINKAN } from '../types'

interface Props {
  file: File | null
  onChange(file: File | null): void
  error?: string
  disabled?: boolean
}

/** Pilih satu berkas lewat klik atau seret-lepas. Validasi tipe dan ukuran dilakukan oleh pemanggil. */
export function FileDropzone({ file, onChange, error, disabled = false }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [menyeret, setMenyeret] = useState(false)

  const lepas = (e: DragEvent) => {
    e.preventDefault()
    setMenyeret(false)
    if (disabled) return
    // Hanya satu berkas yang diizinkan; sisanya diabaikan.
    const pertama = e.dataTransfer.files[0]
    if (pertama) onChange(pertama)
  }

  const hapus = () => {
    onChange(null)
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        Berkas
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setMenyeret(true)
        }}
        onDragLeave={() => setMenyeret(false)}
        onDrop={lepas}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          error ? 'border-red-400 bg-red-50' : menyeret ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'
        }`}
      >
        {file ? (
          <div className="flex items-center justify-between gap-3 text-left">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">{formatUkuran(file.size / 1024 / 1024)}</p>
            </div>
            <button
              type="button"
              onClick={hapus}
              disabled={disabled}
              aria-label={`Hapus berkas ${file.name}`}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <FileUp className="mx-auto size-8 text-slate-400" aria-hidden />
            <p className="mt-2 text-sm text-slate-600">
              Seret berkas ke sini atau{' '}
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={disabled}
                className="font-semibold text-brand-700 underline disabled:opacity-50"
              >
                pilih berkas
              </button>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {TIPE_DIIZINKAN.map((t) => t.toUpperCase()).join(', ')} · maksimal {BATAS_UNGGAH.maksMb} MB · satu berkas
            </p>
          </>
        )}
        <input
          ref={input}
          id={id}
          type="file"
          accept={TIPE_DIIZINKAN.map((t) => `.${t}`).join(',')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="sr-only"
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
