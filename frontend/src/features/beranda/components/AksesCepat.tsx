import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'

export interface ItemAkses {
  ikon: LucideIcon
  label: string
  to: string
}

export function AksesCepat({ judul = 'Akses cepat', item }: { judul?: string; item: ItemAkses[] }) {
  return (
    <section aria-label={judul}>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{judul}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {item.map(({ ikon: Ikon, label, to }) => (
          <Link key={to} to={to}>
            <Card className="flex items-center gap-3 transition hover:border-brand-200">
              <Ikon className="size-6 text-brand-600" aria-hidden />
              <span className="font-medium text-slate-800">{label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
