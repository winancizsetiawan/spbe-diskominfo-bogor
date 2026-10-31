import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { useRingkasanNotifikasi } from '@/features/notifikasi/api'

export function NotificationBell() {
  const { data } = useRingkasanNotifikasi()
  const jumlah = data?.belumDibaca ?? 0

  return (
    <Link
      to="/notifikasi"
      aria-label={jumlah > 0 ? `Notifikasi, ${jumlah} belum dibaca` : 'Notifikasi'}
      className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
    >
      <Bell className="size-5" aria-hidden />
      {jumlah > 0 && (
        <span className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
          {jumlah > 9 ? '9+' : jumlah}
        </span>
      )}
    </Link>
  )
}
