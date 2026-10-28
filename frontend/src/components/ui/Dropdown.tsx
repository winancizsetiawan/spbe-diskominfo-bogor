import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'

interface Props {
  label: ReactNode
  /** Label untuk pembaca layar bila `label` hanya ikon/gambar. */
  ariaLabel?: string
  align?: 'left' | 'right'
  children: ReactNode
}

/** Menu tarik-turun yang tertutup saat klik di luar, Escape, atau pindah halaman. */
export function Dropdown({ label, ariaLabel, align = 'left', children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => setOpen(false), [location])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-600 hover:text-brand-700"
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-40 mt-1 min-w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export const menuItemClass =
  'block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 aria-[current=page]:font-semibold aria-[current=page]:text-brand-700'
