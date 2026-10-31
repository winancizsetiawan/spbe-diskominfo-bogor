export function Spinner({ className = '', label = 'Memuat…' }: { className?: string; label?: string }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-3 text-sm text-slate-500 ${className}`}>
      <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
      {label}
    </div>
  )
}
