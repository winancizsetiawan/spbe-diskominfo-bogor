import { useAuth } from '@/auth/useAuth'

/** Login SSO berhasil tetapi akun belum diundang ke portal (K5): akses publik + pesan. */
export function NoticeBanner() {
  const { notice, logout } = useAuth()
  if (notice !== 'belum_terdaftar') return null
  return (
    <div role="alert" className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-amber-800">
        <p>Akun SSO Anda belum terdaftar di portal ini. Hubungi Super Admin Diskominfo untuk mendapatkan undangan.</p>
        <button type="button" onClick={logout} className="font-semibold underline">
          Keluar
        </button>
      </div>
    </div>
  )
}
