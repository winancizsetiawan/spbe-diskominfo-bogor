import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'

export function AccountInactivePage() {
  const { logout } = useAuth()
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Akun tidak aktif</h1>
      <p className="mt-2 text-sm text-slate-600">
        Akun Anda sedang dinonaktifkan. Hubungi Super Admin Diskominfo Kota Bogor untuk mengaktifkannya kembali.
      </p>
      <Button variant="secondary" className="mt-6" onClick={logout}>
        Keluar
      </Button>
    </div>
  )
}
