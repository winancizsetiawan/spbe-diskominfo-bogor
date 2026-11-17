import { FileText, Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { errorMessage } from '@/lib/errors'
import { unggahLampiran } from '../api'
import { adalahGambar, BATAS, TIPE_LAMPIRAN, type Lampiran } from '../types'

interface Props {
  id: string
  value: Lampiran[]
  onChange(lampiran: Lampiran[]): void
  /** Dipanggil saat unggahan mulai/selesai agar form menahan tombol kirim. */
  onSibuk?(sibuk: boolean): void
}

export const formatUkuran = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`

/** Pilih gambar/PDF; tiap berkas langsung diunggah dan hanya id-nya yang dikirim bersama thread/balasan. */
export function LampiranInput({ id, value, onChange, onSibuk }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [proses, setProses] = useState(0)
  const [galat, setGalat] = useState<string | null>(null)

  const pilih = async (files: FileList | null) => {
    if (!files?.length) return
    setGalat(null)
    const sisa = BATAS.lampiranMax - value.length
    const daftar = Array.from(files)
    if (daftar.length > sisa) {
      setGalat(`Maksimal ${BATAS.lampiranMax} lampiran per kiriman.`)
      daftar.splice(sisa)
    }
    const valid = daftar.filter((f) => {
      if (!(TIPE_LAMPIRAN as readonly string[]).includes(f.type)) {
        setGalat(`${f.name}: hanya gambar (PNG, JPG, WEBP) atau PDF.`)
        return false
      }
      if (f.size > BATAS.lampiranBytes) {
        setGalat(`${f.name}: ukuran maksimal 5 MB.`)
        return false
      }
      return true
    })
    if (!valid.length) return

    setProses((n) => n + valid.length)
    onSibuk?.(true)
    let hasil = value
    for (const f of valid) {
      try {
        const l = await unggahLampiran(f)
        hasil = [...hasil, l]
        onChange(hasil)
      } catch (err) {
        setGalat(`${f.name}: ${errorMessage(err)}`)
      } finally {
        setProses((n) => n - 1)
      }
    }
    onSibuk?.(false)
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        accept={TIPE_LAMPIRAN.join(',')}
        className="sr-only"
        onChange={(e) => {
          void pilih(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={value.length >= BATAS.lampiranMax || proses > 0}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Paperclip className="size-4" aria-hidden />
        {proses > 0 ? `Mengunggah ${proses} berkas…` : 'Lampirkan gambar atau PDF'}
      </button>
      <p className="text-xs text-slate-600">
        PNG, JPG, WEBP, atau PDF. Maksimal {BATAS.lampiranMax} berkas, masing-masing 5 MB.
      </p>
      {galat && (
        <p role="alert" className="text-sm text-red-600">
          {galat}
        </p>
      )}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((l) => (
            <li key={l.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-1.5 pl-2 text-sm">
              {adalahGambar(l.tipe) ? (
                <img src={l.url} alt="" className="size-8 rounded object-cover" />
              ) : (
                <FileText className="size-5 text-red-600" aria-hidden />
              )}
              <span className="max-w-48 truncate text-slate-700">{l.nama}</span>
              <span className="text-xs text-slate-500">{formatUkuran(l.ukuran)}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== l.id))}
                aria-label={`Hapus lampiran ${l.nama}`}
                className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Tampilan lampiran pada thread/balasan: gambar sebagai pratinjau, PDF sebagai tautan unduh. */
export function DaftarLampiran({ lampiran }: { lampiran: Lampiran[] }) {
  if (!lampiran.length) return null
  const gambar = lampiran.filter((l) => adalahGambar(l.tipe))
  const berkas = lampiran.filter((l) => !adalahGambar(l.tipe))
  return (
    <div className="mt-4 space-y-3">
      {gambar.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {gambar.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-lg border border-slate-200"
                title={l.nama}
              >
                <img src={l.url} alt={l.nama} loading="lazy" className="aspect-video w-full bg-slate-100 object-cover transition group-hover:opacity-90" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {berkas.length > 0 && (
        <ul className="space-y-1.5">
          {berkas.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                download={l.nama}
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-700"
              >
                <FileText className="size-4 shrink-0 text-red-600" aria-hidden />
                <span className="truncate">{l.nama}</span>
                <span className="shrink-0 text-xs text-slate-500">PDF · {formatUkuran(l.ukuran)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
