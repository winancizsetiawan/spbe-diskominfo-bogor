import { Link } from 'react-router'
import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { useBeranda } from './api'
import type { Beranda } from './types'
import { AdminOpdView } from './views/AdminOpdView'
import { InternalView } from './views/InternalView'
import { SuperAdminView } from './views/SuperAdminView'

const waktuSalam = () => {
  const jam = new Date().getHours()
  return jam < 11 ? 'pagi' : jam < 15 ? 'siang' : jam < 18 ? 'sore' : 'malam'
}

const tanggalHariIni = () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase()

/** Hal yang paling perlu diperhatikan per role, ditampilkan sebagai tautan cepat di spanduk. */
function sorotan(b: Beranda): { label: string; to: string }[] {
  if (b.tipe === 'super_admin')
    return [
      { label: `${b.ringkasan.menungguValidasi} menunggu validasi`, to: '/admin/validasi' },
      { label: `${b.ringkasan.laporanBaru} laporan forum baru`, to: '/admin/moderasi' },
    ]
  if (b.tipe === 'admin_opd')
    return [
      { label: `${b.ringkasan.totalAplikasi} aplikasi`, to: '/katalog/aplikasi' },
      { label: `Kepatuhan RAA ${b.ringkasan.kepatuhanRaa}%`, to: '/katalog/dasbor' },
    ]
  return [{ label: `${b.belumDibaca} notifikasi baru`, to: '/notifikasi' }]
}

/** Beranda pengguna login: server memilih isi sesuai role, tampilan dibedakan oleh `tipe`. */
export function BerandaPage() {
  const { user } = useAuth()
  const beranda = useBeranda()
  if (!user) return null

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 px-6 py-8 text-white sm:px-10">
        {/* Lambang kota sebagai tanda air di kanan; hiasan saja. */}
        <img src="/logo bogor.png" alt="" aria-hidden className="pointer-events-none absolute -right-6 -bottom-8 hidden h-64 w-auto opacity-10 sm:block" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full border border-white/30 bg-white/15 text-xl font-bold">
            {inisial(user.nama)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-brand-100">{tanggalHariIni()}</p>
            <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl">
              Selamat {waktuSalam()}, {user.nama}
            </h1>
            <p className="mt-1 text-sm text-brand-100">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-medium text-white">{ROLE_LABEL[user.role]}</span> {user.instansi.nama}
            </p>
          </div>
        </div>
        {beranda.data && (
          <ul aria-label="Perlu perhatian" className="relative mt-5 flex flex-wrap gap-2">
            {sorotan(beranda.data).map((x) => (
              <li key={x.to}>
                <Link to={x.to} className="inline-flex min-h-9 items-center rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-white/20">
                  {x.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {beranda.isPending ? (
        <Spinner className="py-16" />
      ) : beranda.isError ? (
        <ErrorState message={errorMessage(beranda.error)} onRetry={() => void beranda.refetch()} />
      ) : beranda.data.tipe === 'admin_opd' ? (
        <AdminOpdView data={beranda.data} />
      ) : beranda.data.tipe === 'super_admin' ? (
        <SuperAdminView data={beranda.data} />
      ) : (
        <InternalView data={beranda.data} />
      )}
    </div>
  )
}
