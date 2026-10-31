import { statusRaaDari } from '../types'

const WARNA = {
  sesuai: 'bg-emerald-500',
  perlu_penyesuaian: 'bg-amber-500',
  belum: 'bg-red-500',
}

export function NilaiBar({ nilai, label = 'Nilai kesesuaian' }: { nilai: number; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={nilai}
        className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${WARNA[statusRaaDari(nilai)]}`} style={{ width: `${nilai}%` }} />
      </div>
      <span className="w-10 text-sm font-medium text-slate-700 tabular-nums">{nilai}%</span>
    </div>
  )
}
