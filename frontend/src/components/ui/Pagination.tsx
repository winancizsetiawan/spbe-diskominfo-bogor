import { Button } from './Button'

interface Props {
  page: number
  totalPages: number
  onChange(page: number): void
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Navigasi halaman" className="mt-6 flex items-center justify-between gap-4">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Sebelumnya
      </Button>
      <span className="text-sm text-slate-600">
        Halaman {page} dari {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Berikutnya
      </Button>
    </nav>
  )
}
