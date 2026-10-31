import { Link } from 'react-router'
import { waktuRelatif } from '@/lib/format'
import { safeReturn } from '@/lib/safeReturn'
import type { Notifikasi } from '@/features/notifikasi/types'
import { Panel } from './Panel'

/** Tiga notifikasi terbaru; membuka satu menuju halaman tujuannya. */
export function NotifikasiRingkas({ notifikasi, belumDibaca, judul = 'Notifikasi terbaru' }: { notifikasi: Notifikasi[]; belumDibaca: number; judul?: string }) {
  return (
    <Panel judul={judul} tautan={{ to: '/notifikasi', label: belumDibaca > 0 ? `Lihat semua (${belumDibaca} baru)` : 'Lihat semua' }}>
      {notifikasi.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada notifikasi.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {notifikasi.map((n) => (
            <li key={n.id}>
              <Link to={safeReturn(n.urlTujuan, '/notifikasi')} className="block py-3 first:pt-0 last:pb-0 hover:text-brand-700">
                <span className="flex items-center gap-2">
                  <span className={`text-sm ${n.sudahDibaca ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{n.judul}</span>
                  {!n.sudahDibaca && (
                    <>
                      <span aria-hidden className="size-2 rounded-full bg-brand-600" />
                      <span className="sr-only">Belum dibaca</span>
                    </>
                  )}
                </span>
                <span className="block text-sm text-slate-600">{n.pesan}</span>
                <span className="block text-xs text-slate-500">{waktuRelatif(n.dibuatPada)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
