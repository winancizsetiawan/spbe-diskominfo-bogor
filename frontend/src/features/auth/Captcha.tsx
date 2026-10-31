import { RefreshCw } from 'lucide-react'
import { useCallback, useState } from 'react'

// CAPTCHA demo di sisi klien. Di produksi tantangan dibuat dan diperiksa server
// (Keycloak / gateway); jawaban tidak boleh dikenali dari kode klien.
interface Soal {
  a: number
  b: number
  jawaban: string
  /** Posisi acak untuk gangguan visual. */
  noise: { x1: number; y1: number; x2: number; y2: number }[]
}

const acak = (n: number) => Math.floor(Math.random() * n)

function buatSoal(): Soal {
  const a = 2 + acak(8)
  const b = 2 + acak(8)
  return {
    a,
    b,
    jawaban: String(a + b),
    noise: Array.from({ length: 4 }, () => ({ x1: acak(140), y1: acak(48), x2: acak(140), y2: acak(48) })),
  }
}

export function useCaptcha() {
  const [soal, setSoal] = useState(buatSoal)
  const segarkan = useCallback(() => setSoal(buatSoal()), [])
  const benar = (jawaban: string) => jawaban.trim() === soal.jawaban
  return { soal, segarkan, benar }
}

interface Props {
  soal: Soal
  onSegarkan(): void
}

export function CaptchaGambar({ soal, onSegarkan }: Props) {
  return (
    <div className="flex items-center gap-2">
      <svg
        viewBox="0 0 140 48"
        role="img"
        aria-label={`Berapa hasil ${soal.a} ditambah ${soal.b}?`}
        className="h-12 w-36 shrink-0 rounded-lg border border-slate-200 bg-slate-50"
      >
        {soal.noise.map((n, i) => (
          <line key={i} {...n} stroke="#94a3b8" strokeWidth="1" />
        ))}
        <text x="70" y="32" textAnchor="middle" fontSize="24" fontWeight="700" fill="#1e293b" letterSpacing="3" transform={`rotate(${soal.a - 5} 70 24)`}>
          {soal.a} + {soal.b}
        </text>
      </svg>
      <button
        type="button"
        onClick={onSegarkan}
        aria-label="Ganti soal captcha"
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <RefreshCw className="size-4" aria-hidden />
      </button>
    </div>
  )
}
