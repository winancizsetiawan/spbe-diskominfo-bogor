import { Navigate, Outlet, useLocation } from 'react-router'
import { Spinner } from '@/components/ui/Spinner'
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
  return <Outlet />
}

export function RequirePermission({ perm }: { perm: Permission }) {
  const { can } = useAuth()
  return can(perm) ? <Outlet /> : <ForbiddenPage />
}
