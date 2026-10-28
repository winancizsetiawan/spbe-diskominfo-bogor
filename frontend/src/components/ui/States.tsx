import type { ReactNode } from 'react'
import { Button } from './Button'

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}
