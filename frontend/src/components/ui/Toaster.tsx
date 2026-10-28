import { X } from 'lucide-react'
import { useToasts } from './toast'

const TONE = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-slate-200 bg-white text-slate-800',
}

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${TONE[t.tone]}`}>
          <p className="flex-1">{t.message}</p>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi" className="opacity-60 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
