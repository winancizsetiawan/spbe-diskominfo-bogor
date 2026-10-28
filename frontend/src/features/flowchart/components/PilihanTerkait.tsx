import { useId } from 'react'

interface Item {
  id: number
  label: string
}

interface Props {
  legend: string
  items: Item[] | undefined
  terpilih: number[]
  onChange(ids: number[]): void
  kosong: string
  error?: string
  disabled?: boolean
}

/** Daftar kotak centang untuk memilih keterkaitan (aplikasi atau SOP). */
export function PilihanTerkait({ legend, items, terpilih, onChange, kosong, error, disabled = false }: Props) {
  const id = useId()
  const ubah = (itemId: number, nyala: boolean) =>
    onChange(nyala ? [...terpilih, itemId] : terpilih.filter((x) => x !== itemId))

  return (
    <fieldset disabled={disabled} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">
        {legend} <span className="font-normal text-slate-500">({terpilih.length} dipilih)</span>
      </legend>
      <div className={`max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-white p-2 ${error ? 'border-red-400' : 'border-slate-300'}`}>
        {!items ? (
          <p className="px-2 py-1 text-sm text-slate-500">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-1 text-sm text-slate-500">{kosong}</p>
        ) : (
          items.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={terpilih.includes(item.id)}
                onChange={(e) => ubah(item.id, e.target.checked)}
                className="mt-0.5"
              />
              {item.label}
            </label>
          ))
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  )
}
