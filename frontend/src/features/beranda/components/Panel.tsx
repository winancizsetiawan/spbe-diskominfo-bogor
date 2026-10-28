import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'

interface Props {
  judul: string
  /** Tautan "Lihat semua" di sudut kanan atas. */
  tautan?: { to: string; label: string }
  children: ReactNode
  className?: string
}

/** Kartu bagian Beranda dengan judul bertaut ke halaman lengkapnya. */
export function Panel({ judul, tautan, children, className = '' }: Props) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{judul}</h2>
        {tautan && (
          <Link to={tautan.to} className="-my-1 py-1 text-sm font-medium text-brand-700 hover:underline">
            {tautan.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  )
}
