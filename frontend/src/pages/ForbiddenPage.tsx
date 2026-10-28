import { ShieldX } from 'lucide-react'
import { Link } from 'react-router'
import { buttonClass } from '@/components/ui/Button'

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <ShieldX className="size-12 text-red-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Akses ditolak</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Peran akun Anda tidak memiliki hak untuk membuka halaman ini.
      </p>
      <Link to="/beranda" className={buttonClass('secondary', 'mt-6')}>
        Kembali ke Beranda
      </Link>
    </div>
  )
}
