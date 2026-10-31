import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { authAdapter, authMode } from '@/auth/adapter'
import type { Role } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { safeReturn } from '@/lib/safeReturn'
import { CaptchaGambar, useCaptcha } from './Captcha'

const PERAN: { role: Role; label: string }[] = [
  { role: 'super_admin', label: 'Super Admin' },
  { role: 'admin_opd', label: 'Admin OPD' },
  { role: 'asn', label: 'ASN & Akademisi' },
]

// Akun contoh mode demo. Tidak dipakai di mode Keycloak; kredensial asli diperiksa SSO.
const AKUN_DEMO: { role: Role; tab: Role; username: string; sandi: string }[] = [
  { role: 'super_admin', tab: 'super_admin', username: 'superadmin', sandi: 'Super@123' },
  { role: 'admin_opd', tab: 'admin_opd', username: 'adminopd', sandi: 'Admin@123' },
  { role: 'asn', tab: 'asn', username: 'asn', sandi: 'Asn@123' },
  { role: 'akademisi', tab: 'asn', username: 'akademisi', sandi: 'Akademisi@123' },
]

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 aria-[invalid=true]:border-red-500'

interface Galat {
  username?: string
  sandi?: string
  captcha?: string
}

export function LoginPage() {
  const [params] = useSearchParams()
  const kembali = safeReturn(params.get('kembali'))
  const { status, user } = useAuth()
  const captcha = useCaptcha()

  const [role, setRole] = useState<Role>('asn')
  const [username, setUsername] = useState('')
  const [sandi, setSandi] = useState('')
  const [jawaban, setJawaban] = useState('')
  const [lihat, setLihat] = useState(false)
  const [galat, setGalat] = useState<Galat>({})

  useEffect(() => {
    if (authMode === 'keycloak' && status === 'anonymous') authAdapter.login(kembali)
  }, [status, kembali])

  if (user) return <Navigate to={kembali} replace />
  if (authMode === 'keycloak') return <Spinner className="py-24" label="Mengarahkan ke SSO Pemkot Bogor…" />

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    const baru: Galat = {}
    if (!username.trim()) baru.username = 'Username wajib diisi.'
    if (!sandi) baru.sandi = 'Kata sandi wajib diisi.'
    if (!jawaban.trim()) baru.captcha = 'Jawab soal captcha.'
    else if (!captcha.benar(jawaban)) {
      baru.captcha = 'Jawaban captcha salah. Coba soal yang baru.'
      captcha.segarkan()
      setJawaban('')
    }
    const akun = AKUN_DEMO.find((a) => a.tab === role && a.username === username.trim() && a.sandi === sandi)
    if (!akun && !baru.username && !baru.sandi && !baru.captcha) {
      baru.sandi = 'Username atau kata sandi salah untuk peran ini.'
      captcha.segarkan()
      setJawaban('')
    }
    setGalat(baru)
    if (!akun || Object.keys(baru).length > 0) return

    authAdapter.loginAs?.(akun.role)
    // Muat ulang penuh agar AuthProvider membaca sesi baru, sama seperti kembali dari SSO.
    window.location.assign(kembali)
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-2 md:gap-6 md:p-5">
      <section className="flex flex-col justify-between gap-10 rounded-2xl bg-gradient-to-br from-brand-900 to-brand-600 p-6 text-white md:min-h-[34rem] md:p-9">
        <div className="flex items-center gap-3">
          <img src="/logo bogor.png" alt="" width={48} height={56} className="h-14 w-auto" />
          <div>
            <p className="text-lg font-semibold">SPBE Portal Satu Akses</p>
            <p className="text-xs tracking-wide text-brand-100 uppercase">Kota Bogor</p>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Satu Akses Terpadu Layanan SPBE</h2>
          <p className="mt-3 text-sm text-brand-100">
            Akses terintegrasi tata kelola pemerintahan digital, arsitektur instansi, dan kolaborasi aparatur negara secara aman dan presisi.
          </p>
        </div>
      </section>

      <section className="px-3 py-6 md:px-6 md:py-9">
        <h1 className="text-3xl font-bold text-brand-800">Login</h1>

        <form onSubmit={kirim} noValidate className="mt-6 space-y-5">
          <fieldset>
            <legend className="sr-only">Masuk sebagai</legend>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-slate-100 p-1">
              {PERAN.map((p) => (
                <label
                  key={p.role}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-full px-2 text-center text-sm font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-600 ${role === p.role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <input type="radio" name="peran" value={p.role} checked={role === p.role} onChange={() => setRole(p.role)} className="sr-only" />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="login-username" className="block text-sm font-semibold text-slate-800">
              Username
            </label>
            <input
              id="login-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!galat.username}
              aria-describedby={galat.username ? 'login-username-error' : undefined}
              className={fieldClass}
            />
            {galat.username && (
              <p id="login-username-error" className="text-sm text-red-600">
                {galat.username}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="login-sandi" className="block text-sm font-semibold text-slate-800">
                Kata Sandi
              </label>
              <a href="/bantuan" className="inline-flex min-h-6 items-center text-sm font-medium text-brand-700 hover:underline">
                Lupa Kata Sandi?
              </a>
            </div>
            <div className="relative">
              <input
                id="login-sandi"
                type={lihat ? 'text' : 'password'}
                autoComplete="current-password"
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                aria-invalid={!!galat.sandi}
                aria-describedby={galat.sandi ? 'login-sandi-error' : undefined}
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setLihat((v) => !v)}
                aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={lihat}
                className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:text-slate-900"
              >
                {lihat ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
              </button>
            </div>
            {galat.sandi && (
              <p id="login-sandi-error" className="text-sm text-red-600">
                {galat.sandi}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-captcha" className="block text-sm font-semibold text-slate-800">
              Verifikasi captcha
            </label>
            <CaptchaGambar soal={captcha.soal} onSegarkan={captcha.segarkan} />
            <input
              id="login-captcha"
              inputMode="numeric"
              autoComplete="off"
              value={jawaban}
              onChange={(e) => setJawaban(e.target.value)}
              placeholder="Hasil penjumlahan"
              aria-invalid={!!galat.captcha}
              aria-describedby={galat.captcha ? 'login-captcha-error' : undefined}
              className={fieldClass}
            />
            {galat.captcha && (
              <p id="login-captcha-error" role="alert" className="text-sm text-red-600">
                {galat.captcha}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="min-h-12 w-full cursor-pointer rounded-full bg-gradient-to-r from-brand-900 to-brand-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:brightness-110"
          >
            Masuk ke Akun
          </button>
          <p className="text-center text-sm text-slate-600">
            Belum terdaftar di Arsitektur SPBE?
            <br />
            Hubungi Admin
          </p>
          <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium">Akun contoh (mode demo)</summary>
            <ul className="mt-2 space-y-1">
              {AKUN_DEMO.map((a) => (
                <li key={a.username}>
                  <button
                    type="button"
                    onClick={() => {
                      setRole(a.tab)
                      setUsername(a.username)
                      setSandi(a.sandi)
                    }}
                    className="min-h-6 cursor-pointer text-left hover:underline"
                  >
                    <span className="font-mono">{a.username}</span> / <span className="font-mono">{a.sandi}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2">Klik akun untuk mengisi formulir otomatis.</p>
          </details>
        </form>
      </section>
    </div>
  )
}
