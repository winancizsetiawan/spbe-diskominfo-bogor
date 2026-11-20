import { Copy, KeyRound, ShieldCheck, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from '@/components/ui/toast'

interface Props {
  open: boolean
  butuhSetup: boolean
  uri?: string
  secret?: string
  memuat: boolean
  galat?: string | null
  onBatal(): void
  onVerifikasi(kode: string): void
}

export function TwoFAModal({ open, butuhSetup, uri, secret, memuat, galat, onBatal, onVerifikasi }: Props) {
  const [kode, setKode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setKode('')
      return
    }
    if (butuhSetup && uri) {
      QRCode.toDataURL(uri, { width: 220, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [open, butuhSetup, uri])

  if (!open) return null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onVerifikasi(kode.trim())
  }

  const salinSecret = async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      toast.success('Kunci rahasia 2FA disalin.')
    } catch {
      toast.error('Gagal menyalin kunci.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-2fa"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-5 text-white">
          <div>
            <h2 id="judul-2fa" className="flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="size-5 shrink-0 text-brand-100" aria-hidden />
              {butuhSetup ? 'Aktifkan Autentikasi 2FA' : 'Verifikasi Dua Faktor (2FA)'}
            </h2>
            <p className="mt-0.5 text-xs text-brand-100">
              {butuhSetup
                ? 'Pindai QR Code dengan Google Authenticator / Microsoft Authenticator'
                : 'Masukkan kode 6 digit dari aplikasi Authenticator Anda'}
            </p>
          </div>
          <button
            type="button"
            onClick={onBatal}
            disabled={memuat}
            aria-label="Tutup"
            className="cursor-pointer rounded-full p-1.5 text-brand-100 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {butuhSetup && (
            <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 text-center">
              <p className="text-xs leading-relaxed text-slate-600">
                Untuk keamanan login pertama kali, pasang aplikasi <strong>Google Authenticator</strong> atau{' '}
                <strong>Microsoft Authenticator</strong> di ponsel Anda lalu pindai kode QR berikut:
              </p>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code 2FA" className="mx-auto size-44 rounded-xl border border-slate-200 bg-white p-2" />
              ) : (
                <div className="mx-auto grid size-44 place-items-center rounded-xl border border-slate-200 bg-white text-xs text-slate-400">
                  Menyiapkan QR Code...
                </div>
              )}
              {secret && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs">
                  <KeyRound className="size-3.5 text-brand-700" aria-hidden />
                  <code className="font-mono font-semibold text-slate-700">{secret}</code>
                  <button
                    type="button"
                    onClick={() => void salinSecret()}
                    className="ml-1 cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                    title="Salin kunci manual"
                  >
                    <Copy className="size-3.5" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="kode-2fa" className="block text-sm font-semibold text-slate-800">
              Kode 6 Digit Authenticator
            </label>
            <input
              id="kode-2fa"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={kode}
              onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {galat && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
              {galat}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onBatal}
              disabled={memuat}
              className="min-h-11 flex-1 cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={kode.length !== 6 || memuat}
              className="min-h-11 flex-1 cursor-pointer rounded-full bg-gradient-to-r from-brand-900 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              {memuat ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
