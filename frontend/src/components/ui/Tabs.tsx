import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface TabItem<K extends string> {
  key: K
  label: string
}

interface Props<K extends string> {
  tabs: TabItem<K>[]
  aktif: K
  onChange(key: K): void
  label: string
  children: ReactNode
}

/** Tab dengan pola WAI-ARIA: panah kiri/kanan berpindah tab, Home/End ke ujung. */
export function Tabs<K extends string>({ tabs, aktif, onChange, label, children }: Props<K>) {
  const refs = useRef<Partial<Record<K, HTMLButtonElement | null>>>({})

  const pindah = (e: KeyboardEvent, indeks: number) => {
    const ke =
      e.key === 'ArrowRight' ? (indeks + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (indeks - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : null
    if (ke === null) return
    e.preventDefault()
    const tujuan = tabs[ke].key
    onChange(tujuan)
    refs.current[tujuan]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[t.key] = el
            }}
            id={`tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={aktif === t.key}
            aria-controls={`panel-${t.key}`}
            tabIndex={aktif === t.key ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => pindah(e, i)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
              aktif === t.key ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`panel-${aktif}`} role="tabpanel" aria-labelledby={`tab-${aktif}`} tabIndex={0} className="pt-6">
        {children}
      </div>
    </div>
  )
}
