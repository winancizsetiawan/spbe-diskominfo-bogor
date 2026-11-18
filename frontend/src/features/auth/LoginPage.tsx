import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { api, ApiError } from '@/api/client'
import { authAdapter, authMode } from '@/auth/adapter'
import type { JawabanLogin, Role } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Hakcipta } from '@/components/layout/Hakcipta'
import { Spinner } from '@/components/ui/Spinner'
import { safeReturn } from '@/lib/safeReturn'
import { CaptchaGambar, useCaptcha } from './Captcha'

// Akun contoh mode demo. Tidak dipakai di mode Keycloak; kredensial asli diperiksa SSO.
const AKUN_DEMO: { role: Role; username: string; sandi: string }[] = [
  { role: 'super_admin', username: 'superadmin', sandi: 'Super@123' },
  { role: 'admin_opd', username: 'adminopd', sandi: 'Admin@123' },
  { role: 'asn', username: 'asn', sandi: 'Asn@123' },
  { role: 'akademisi', username: 'akademisi', sandi: 'Akademisi@123' },
]

const MAKS_GAGAL_LOGIN = 5
const DURASI_BLOKIR_MS = 15 * 60 * 1000
const KUNCI_STORAGE_BRUTE = 'spbe.bruteForce'

interface StatusBruteForce {
  gagal: number
  terkunciHingga: number | null
}

function bacaBruteForce(username: string): StatusBruteForce {
  try {
    const raw = localStorage.getItem(KUNCI_STORAGE_BRUTE)
    const semua = raw ? (JSON.parse(raw) as Record<string, StatusBruteForce>) : {}
    const data = semua[username.toLowerCase()] ?? { gagal: 0, terkunciHingga: null }
    if (data.terkunciHingga && Date.now() > data.terkunciHingga) {
      simpanBruteForce(username, { gagal: 0, terkunciHingga: null })
      return { gagal: 0, terkunciHingga: null }
    }
    return data
  } catch {
    return { gagal: 0, terkunciHingga: null }
  }
}

function simpanBruteForce(username: string, status: StatusBruteForce) {
  try {
    const raw = localStorage.getItem(KUNCI_STORAGE_BRUTE)
    const semua = raw ? (JSON.parse(raw) as Record<string, StatusBruteForce>) : {}
    semua[username.toLowerCase()] = status
    localStorage.setItem(KUNCI_STORAGE_BRUTE, JSON.stringify(semua))
  } catch {
    // Abaikan bila localStorage tidak tersedia
  }
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 aria-[invalid=true]:border-red-500'

interface Galat {
  username?: string
  sandi?: string
  captcha?: string
  blokir?: string
}

export function LoginPage() {
  const [params] = useSearchParams()
  const kembali = safeReturn(params.get('kembali'))
  const { status, user } = useAuth()
  const captcha = useCaptcha()

  const [username, setUsername] = useState('')
  const [sandi, setSandi] = useState('')
  const [jawaban, setJawaban] = useState('')
  const [lihat, setLihat] = useState(false)
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState<Galat>({})

  useEffect(() => {
    if (authMode === 'keycloak' && status === 'anonymous') authAdapter.login(kembali)
  }, [status, kembali])

  if (user) return <Navigate to={kembali} replace />
  if (authMode === 'keycloak') return <Spinner className="py-24" label="Mengarahkan ke SSO Pemkot Bogor…" />

  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    const baru: Galat = {}
    const userTrim = username.trim()
    if (!userTrim) baru.username = 'Username atau NIP wajib diisi.'
    if (!sandi) baru.sandi = 'Kata sandi wajib diisi.'
    if (!jawaban.trim()) baru.captcha = 'Jawab soal captcha.'
    else if (!captcha.benar(jawaban)) {
      baru.captcha = 'Jawaban captcha salah. Coba soal yang baru.'
      captcha.segarkan()
      setJawaban('')
    }
    if (Object.keys(baru).length > 0) {
      setGalat(baru)
      return
    }

    setMemuat(true)
    try {
      const res = await api<JawabanLogin>('/auth/login', {
        method: 'POST',
        json: { username: userTrim, sandi },
      })
      simpanBruteForce(userTrim, { gagal: 0, terkunciHingga: null })
      // BE menerbitkan token sesi bertanda tangan; mode mock tanpa BE (MSW) tidak mengirim token.
      if (res.token && res.kedaluwarsaPada && authAdapter.loginToken) authAdapter.loginToken(res.token, res.kedaluwarsaPada)
      else authAdapter.loginAs?.(res.role, res.user?.email)
      window.location.assign(kembali)
      return
    } catch (err) {
      const dariServer = err instanceof ApiError && err.status > 0 && err.status !== 404
      // Mode lokal tidak punya akun contoh: kegagalan apa pun ditampilkan, tanpa cadangan akun demo.
      if (dariServer || authMode === 'lokal') {
        captcha.segarkan()
        setJawaban('')
        if (err instanceof ApiError && err.status === 423) {
          setGalat({ blokir: err.message })
        } else {
          setGalat({ sandi: dariServer ? (err as ApiError).message : 'Server portal tidak dapat dihubungi. Coba lagi beberapa saat lagi.' })
        }
        setMemuat(false)
        return
      }
    }

    // Cadangan lokal bila server backend belum aktif atau menggunakan mode mock
    const st = bacaBruteForce(userTrim)
    if (st.terkunciHingga && Date.now() < st.terkunciHingga) {
      const sisaMenit = Math.max(1, Math.ceil((st.terkunciHingga - Date.now()) / 60000))
      captcha.segarkan()
      setJawaban('')
      setGalat({
        blokir: `Akun Anda diblokir karena ${MAKS_GAGAL_LOGIN} kali salah memasukkan kata sandi. Silakan tunggu ${sisaMenit} menit lagi atau hubungi Super Admin Diskominfo untuk memulihkan akun Anda.`,
      })
      setMemuat(false)
      return
    }

    const akun = AKUN_DEMO.find((a) => a.username === userTrim.toLowerCase() && a.sandi === sandi)
    if (!akun) {
      const gagalBaru = st.gagal + 1
      captcha.segarkan()
      setJawaban('')
      if (gagalBaru >= MAKS_GAGAL_LOGIN) {
        simpanBruteForce(userTrim, { gagal: gagalBaru, terkunciHingga: Date.now() + DURASI_BLOKIR_MS })
        setGalat({
          blokir: `Akun Anda telah diblokir karena ${MAKS_GAGAL_LOGIN} kali salah memasukkan kata sandi. Hubungi Super Admin Diskominfo untuk memulihkan akun Anda atau tunggu 15 menit.`,
        })
      } else {
        simpanBruteForce(userTrim, { gagal: gagalBaru, terkunciHingga: null })
        const sisa = MAKS_GAGAL_LOGIN - gagalBaru
        setGalat({
          sandi: `Username atau kata sandi salah. Sisa percobaan: ${sisa} kali lagi sebelum akun diblokir.`,
        })
      }
      setMemuat(false)
      return
    }

    simpanBruteForce(userTrim, { gagal: 0, terkunciHingga: null })
    authAdapter.loginAs?.(akun.role)
    window.location.assign(kembali)
  }

  return (
    // Satu kolom: kartu login lalu hak cipta tepat di bawahnya (layout induk menata anaknya mendatar).
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-2 md:gap-6 md:p-5">
        <section className="flex flex-col justify-between gap-10 rounded-2xl bg-gradient-to-br from-brand-900 to-brand-600 p-6 text-white md:min-h-[34rem] md:p-9">
          <div className="flex items-center gap-3">
            <img src="/logo bogor.png" alt="" width={48} height={56} className="h-14 w-auto" />
            <div>
              <p className="text-lg font-semibold">Portal Satu Akses Arsitektur Digital</p>
              <p className="text-xs tracking-wide text-brand-100 uppercase">Kota Bogor</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Satu Akses Terpadu Layanan Arsitektur Digital</h2>
            <p className="mt-3 text-sm text-brand-100">
              Akses terintegrasi tata kelola pemerintahan digital, arsitektur instansi, dan kolaborasi aparatur negara secara aman dan presisi.
            </p>
          </div>
        </section>

        <section className="px-3 py-6 md:px-6 md:py-9">
          <h1 className="text-3xl font-bold text-brand-800">Masuk</h1>

          <form onSubmit={kirim} noValidate className="mt-6 space-y-5">
            {galat.blokir && (
              <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
                <div className="space-y-1">
                  <p className="font-semibold text-red-900">Akun Diblokir Sementara</p>
                  <p>{galat.blokir}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-username" className="block text-sm font-semibold text-slate-800">
                Username / NIP
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
              disabled={memuat}
              className="min-h-12 w-full cursor-pointer rounded-full bg-gradient-to-r from-brand-900 to-brand-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:brightness-110 disabled:opacity-60"
            >
              {memuat ? 'Memeriksa…' : 'Masuk ke Akun'}
            </button>
            <p className="text-center text-sm text-slate-600">
              Belum terdaftar di Arsitektur Digital?
              <br />
              Hubungi Admin
            </p>
          </form>
        </section>
      </div>
      <p className="mt-4 text-center text-xs text-slate-600">
        <Hakcipta />
      </p>
    </div>
  )
}
