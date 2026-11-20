import { FileText, Info, X } from 'lucide-react'
import { useState } from 'react'

const BUTIR_PERNYATAAN = [
  {
    judul: 'Kebenaran Data Login',
    isi: 'Saya menyatakan bahwa data username/NIP dan password yang saya masukkan adalah benar, milik saya sendiri, dan sesuai dengan identitas yang terdaftar dalam sistem.',
  },
  {
    judul: 'Larangan Penyalahgunaan Data & Informasi',
    isi: 'Saya berkomitmen untuk tidak menyalahgunakan data dan informasi yang saya akses melalui sistem ini untuk kepentingan pribadi, komersial, atau tujuan lain di luar tugas dan kewenangan saya.',
  },
  {
    judul: 'Persetujuan Penggunaan Data Pribadi',
    isi: 'Saya memberikan persetujuan atas penggunaan data pribadi saya (nama, jabatan, akun pengguna) untuk keperluan pengelolaan dan pengoperasian Portal Arsitektur Pemerintah Digital Kota Bogor sesuai fungsi dan tujuan sistem.',
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

export function PernyataanModal({ open, memuat, galat, onBatal, onSetuju }: Props) {
  const [centang, setCentang] = useState(false)

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-pernyataan"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-5 text-white">
          <div>
            <h2 id="judul-pernyataan" className="flex items-center gap-2.5 text-lg font-bold">
              <FileText className="size-5 shrink-0 text-brand-100" aria-hidden />
              Pernyataan &amp; Persetujuan Pengguna
            </h2>
            <p className="mt-0.5 text-sm text-brand-100">Baca dan setujui sebelum melanjutkan ke sistem</p>
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

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs font-medium text-brand-900">
            <Info className="size-4 shrink-0 text-brand-700" aria-hidden />
            <span>Harap baca seluruh pernyataan berikut dengan seksama sebelum melanjutkan.</span>
          </div>

          <ol className="space-y-2.5">
            {BUTIR_PERNYATAAN.map((item, idx) => (
              <li
                key={item.judul}
                className="flex items-start gap-3.5 rounded-xl border border-slate-200 border-l-4 border-l-brand-600 bg-slate-50/70 p-3.5"
              >
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white"
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-900">{item.judul}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.isi}</p>
                </div>
              </li>
            ))}
          </ol>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
            <input
              type="checkbox"
              checked={centang}
              onChange={(e) => setCentang(e.target.checked)}
              className="size-4 rounded border-slate-300 text-brand-700 accent-brand-700 focus:ring-brand-500"
            />
            <span>Saya telah membaca, memahami, dan menyetujui seluruh pernyataan di atas.</span>
          </label>

          {galat && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
              {galat}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onBatal}
            disabled={memuat}
            className="min-h-11 cursor-pointer rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!centang || memuat}
            onClick={onSetuju}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none sm:flex-none"
          >
            {memuat ? 'Memproses...' : 'Setuju & Lanjutkan Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
