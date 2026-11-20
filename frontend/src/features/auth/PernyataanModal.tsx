import { Check, FileText, Info } from 'lucide-react'
import { useState } from 'react'

const BUTIR_PERNYATAAN = [
  {
    judul: 'Kebenaran Data Login',
    isi: 'Saya menyatakan bahwa data username dan password yang saya masukkan adalah benar, milik saya sendiri, dan sesuai dengan identitas yang terdaftar dalam sistem.',
  },
  {
    judul: 'Larangan Penyalahgunaan Data & Informasi',
    isi: 'Saya berkomitmen untuk tidak menyalahgunakan data dan informasi yang saya akses melalui sistem ini untuk kepentingan pribadi, komersial, atau tujuan lain di luar tugas dan kewenangan saya.',
  },
  {
    judul: 'Persetujuan Penggunaan Data Pribadi',
    isi: 'Saya memberikan persetujuan atas penggunaan data pribadi saya (nama, jabatan, akun pengguna) untuk keperluan pengelolaan dan pengoperasian Portal Arsitektur Digital Kota Bogor sesuai fungsi dan tujuan sistem.',
  },
  {
    judul: 'Kerahasiaan & Keamanan Akses',
    isi: 'Saya bertanggung jawab menjaga kerahasiaan kredensial akun saya dan tidak akan membagikan username atau password kepada pihak lain, serta segera melaporkan jika terjadi akses yang tidak sah.',
  },
  {
    judul: 'Kepatuhan terhadap UU PDP No. 27 Tahun 2022',
    isi: 'Saya memahami bahwa pengolahan data pribadi dalam sistem ini dilindungi oleh Undang-Undang Perlindungan Data Pribadi dan saya bersedia mematuhi seluruh ketentuannya.',
  },
]

interface Props {
  open: boolean
  memuat: boolean
  galat?: string | null
  onBatal(): void
  onSetuju(): void
}

export function PernyataanModal({ open, memuat, galat, onSetuju }: Props) {
  const [centang, setCentang] = useState(false)

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-pernyataan"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header Biru Sesuai Desain Asli */}
        <div className="bg-[#2f55b9] px-6 py-4 text-white">
          <h2 id="judul-pernyataan" className="flex items-center gap-2.5 text-base font-bold md:text-lg">
            <FileText className="size-5 shrink-0 text-white" aria-hidden />
            <span>Pernyataan &amp; Persetujuan Pengguna</span>
          </h2>
          <p className="mt-0.5 text-xs text-white/90 md:text-sm">Baca dan setujui sebelum melanjutkan ke sistem</p>
        </div>

        {/* Isi Pernyataan */}
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3.5 py-2.5 text-xs text-blue-800">
            <Info className="size-4 shrink-0 text-blue-600" aria-hidden />
            <span>Harap baca seluruh pernyataan berikut dengan seksama sebelum melanjutkan.</span>
          </div>

          <ol className="space-y-2.5">
            {BUTIR_PERNYATAAN.map((item, idx) => (
              <li
                key={item.judul}
                className="flex items-start gap-3 rounded-lg border border-slate-100 border-l-4 border-l-[#f97316] bg-slate-50/60 p-3"
              >
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#f97316] text-xs font-bold text-white"
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#ea580c]">{item.judul}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.isi}</p>
                </div>
              </li>
            ))}
          </ol>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 md:text-sm">
            <input
              type="checkbox"
              checked={centang}
              onChange={(e) => setCentang(e.target.checked)}
              className="size-4 rounded border-slate-300 text-blue-600 accent-[#2f55b9] focus:ring-blue-500"
            />
            <span>Saya telah membaca, memahami, dan menyetujui seluruh pernyataan di atas.</span>
          </label>

          {galat && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {galat}
            </p>
          )}
        </div>

        {/* Footer Tombol Tunggal Sesuai Desain Asli */}
        <div className="border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            disabled={!centang || memuat}
            onClick={onSetuju}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-3 px-4 text-sm font-semibold text-white transition-all ${
              !centang || memuat
                ? 'cursor-not-allowed bg-[#7e9bd8] opacity-90'
                : 'bg-[#2f55b9] hover:bg-[#25469e] shadow-sm'
            }`}
          >
            <Check className="size-4" aria-hidden />
            <span>{memuat ? 'Memproses...' : 'Setuju & Lanjutkan Login'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
