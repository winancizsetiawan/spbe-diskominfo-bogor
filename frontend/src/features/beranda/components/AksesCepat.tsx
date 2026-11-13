import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

export interface ItemAkses {
  ikon: LucideIcon
  label: string
  to: string
}

/**
 * Kartu pintasan. Jumlah kolom mengikuti lebar wadah (min. 16rem per kartu), jadi di kolom sempit tampil 2x2
 * dan di halaman lebar 4 sejajar; semua kartu sama tinggi agar label dua baris tidak membuat barisan tidak rata.
 */
export function AksesCepat({ judul = 'Akses cepat', item }: { judul?: string; item: ItemAkses[] }) {
  return (
    <section aria-label={judul}>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{judul}</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {item.map(({ ikon: Ikon, label, to }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex h-full min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-200 hover:shadow-sm"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
                <Ikon className="size-5" aria-hidden />
              </span>
              <span className="flex-1 text-sm font-semibold text-slate-800">{label}</span>
              <ChevronRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
