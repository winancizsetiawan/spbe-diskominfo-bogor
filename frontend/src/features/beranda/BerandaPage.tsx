import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { useBeranda } from './api'
import { AdminOpdView } from './views/AdminOpdView'
import { InternalView } from './views/InternalView'
import { SuperAdminView } from './views/SuperAdminView'

/** Beranda pengguna login: server memilih isi sesuai role, tampilan dibedakan oleh `tipe`. */
export function BerandaPage() {
  const { user } = useAuth()
  const beranda = useBeranda()
  if (!user) return null

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 px-6 py-10 text-white sm:px-10">
        <p className="text-sm text-brand-200">
          {ROLE_LABEL[user.role]} · {user.instansi.nama}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Selamat datang kembali, {user.nama}</h1>
      </section>

      {beranda.isPending ? (
        <Spinner className="py-16" />
      ) : beranda.isError ? (
        <ErrorState message={errorMessage(beranda.error)} onRetry={() => void beranda.refetch()} />
      ) : beranda.data.tipe === 'admin_opd' ? (
        <AdminOpdView data={beranda.data} />
      ) : beranda.data.tipe === 'super_admin' ? (
        <SuperAdminView data={beranda.data} />
      ) : (
        <InternalView data={beranda.data} />
      )}
    </div>
  )
}
