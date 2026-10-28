import { Link } from 'react-router'
import { buttonClass } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="text-5xl font-bold text-brand-700">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-slate-600">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <Link to="/" className={buttonClass('secondary', 'mt-6')}>
        Ke halaman utama
      </Link>
    </div>
  )
}
