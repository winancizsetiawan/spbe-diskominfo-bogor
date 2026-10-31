import type { TipeBerkas } from '../types'

const WARNA: Record<TipeBerkas, string> = {
  pdf: 'bg-red-50 text-red-700',
  docx: 'bg-blue-50 text-blue-700',
  xlsx: 'bg-emerald-50 text-emerald-700',
  pptx: 'bg-orange-50 text-orange-700',
}

/** Ikon tipe berkas; teksnya ikut dibacakan karena tipe tidak boleh hanya dibedakan lewat warna. */
export function BerkasIcon({ tipe, className = '' }: { tipe: TipeBerkas; className?: string }) {
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center rounded-lg text-xs font-bold uppercase ${WARNA[tipe]} ${className}`}
    >
      {tipe}
    </span>
  )
}
