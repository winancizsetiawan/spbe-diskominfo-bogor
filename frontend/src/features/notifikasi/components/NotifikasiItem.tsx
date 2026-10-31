import { FileText, GraduationCap, MessagesSquare, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { waktuRelatif } from '@/lib/format'
import { safeReturn } from '@/lib/safeReturn'
import type { KategoriNotifikasi, Notifikasi } from '../types'
import { KATEGORI_LABEL } from '../types'

const IKON: Record<KategoriNotifikasi, { ikon: LucideIcon; warna: string }> = {
  sistem: { ikon: ShieldCheck, warna: 'bg-emerald-50 text-emerald-700' },
  forum: { ikon: MessagesSquare, warna: 'bg-brand-50 text-brand-700' },
  pembelajaran: { ikon: GraduationCap, warna: 'bg-amber-50 text-amber-700' },
  dokumen: { ikon: FileText, warna: 'bg-sky-50 text-sky-700' },
}

interface Props {
  notifikasi: Notifikasi
  onBuka(): void
  onTandaiDibaca(): void
}

export function NotifikasiItem({ notifikasi: n, onBuka, onTandaiDibaca }: Props) {
  const { ikon: Ikon, warna } = IKON[n.kategori]
  return (
    <li
      className={`flex flex-col items-stretch rounded-xl border bg-white transition sm:flex-row ${n.sudahDibaca ? 'border-slate-200' : 'border-brand-200 shadow-sm'}`}
    >
      {/* Seluruh area berupa tautan agar mudah ditekan; membuka notifikasi sekaligus menandainya dibaca. */}
      <Link
        to={safeReturn(n.urlTujuan, '/beranda')}
        onClick={onBuka}
        className="flex min-w-0 flex-1 items-start gap-4 rounded-xl p-4 hover:bg-slate-50"
      >
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${warna}`}>
          <Ikon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`min-w-0 break-words text-base ${n.sudahDibaca ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{n.judul}</span>
            {!n.sudahDibaca && (
              <>
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-600" />
                <span className="sr-only">Belum dibaca</span>
              </>
            )}
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{n.pesan}</span>
          <span className="mt-1 block text-xs text-slate-500">
            {KATEGORI_LABEL[n.kategori]} · <time dateTime={n.dibuatPada}>{waktuRelatif(n.dibuatPada)}</time>
          </span>
        </span>
      </Link>
      {!n.sudahDibaca && (
        <button
          type="button"
          onClick={onTandaiDibaca}
          aria-label={`Tandai dibaca: ${n.judul}`}
          className="min-h-11 shrink-0 cursor-pointer rounded-b-xl border-t border-slate-100 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 sm:rounded-r-xl sm:rounded-bl-none sm:border-t-0 sm:border-l"
        >
          Tandai dibaca
        </button>
      )}
    </li>
  )
}
