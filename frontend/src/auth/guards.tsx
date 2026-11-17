import { AlertTriangle } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { Spinner } from '@/components/ui/Spinner'
import { UbahSandiDialog } from '@/features/profil/components/UbahSandiDialog'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import type { Permission } from './permissions'
import { useAuth } from './useAuth'

/** Halaman untuk pengguna internal; anonim diarahkan ke /masuk lalu kembali. */
export function RequireAuth() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner className="py-24" />
  if (!user) {
    const kembali = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/masuk?kembali=${kembali}`} replace />
  }
  if (user.statusAkun !== 'aktif') return <Navigate to="/akun-tidak-aktif" replace />

  const hampirHabis = user.sisaHariSandi !== undefined && user.sisaHariSandi > 0 && user.sisaHariSandi <= 14

  return (
    <>
      {hampirHabis && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
            Kata sandi Anda akan kedaluwarsa dalam <strong>{user.sisaHariSandi} hari</strong> lagi (kebijakan tahunan).
          </span>
          <Link to="/profil" className="font-semibold text-amber-900 underline hover:text-amber-700">
            Perbarui sekarang
          </Link>
        </div>
      )}
      <Outlet />
      <UbahSandiDialog open={!!user.wajibGantiSandi} wajib onClose={() => {}} />
    </>
  )
}

export function RequirePermission({ perm }: { perm: Permission }) {
  const { can } = useAuth()
  return can(perm) ? <Outlet /> : <ForbiddenPage />
}
