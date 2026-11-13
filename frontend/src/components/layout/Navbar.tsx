import { ChevronDown, LogOut, Search, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { INTERNAL_NAV, KELOLA_NAV, PUBLIC_NAV } from '@/app/navigation'
import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Dropdown, menuItemClass } from '@/components/ui/Dropdown'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'

// Header berlatar biru tua (brand-900, sama dengan footer dan menu samping): teks terang.
// Menu aktif = garis bawah putih yang melebar dari tengah saat berpindah halaman; hover = garis tipis transparan.
// Outline fokus di dalam tautan karena area menu bisa digeser (overflow) dan outline di luar akan terpotong.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg px-3.5 text-[15px] font-medium transition-colors focus-visible:outline-offset-[-3px] after:absolute after:inset-x-3.5 after:bottom-1 after:h-0.5 after:rounded-full after:transition-transform after:duration-200 ${
    isActive
      ? 'text-white after:scale-x-100 after:bg-white'
      : 'text-brand-100 after:scale-x-0 after:bg-white/50 hover:text-white hover:after:scale-x-100'
  }`

export function Navbar() {
  const { user, can, logout } = useAuth()
  const items = user ? INTERNAL_NAV : PUBLIC_NAV
  const kelola = KELOLA_NAV.filter((item) => item.perm && can(item.perm))

  return (
    // Outline fokus putih: warna fokus bawaan (biru) tidak terlihat di atas latar biru tua.
    <header className="sticky top-0 z-30 bg-brand-900 shadow-sm [&_:focus-visible]:outline-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
        <Link to={user ? '/beranda' : '/'} aria-label="Ke beranda" className="rounded-md lg:flex-1">
          <Logo terang />
        </Link>

        {/* Di bawah 1024px menu pindah ke baris sendiri: satu baris penuh baru muat di layar lebar. */}
        <div className="order-last -ml-3.5 flex min-w-0 basis-full items-center gap-1 lg:order-none lg:ml-0 lg:basis-auto lg:flex-none lg:justify-center">
          {/* Menu bisa digeser di layar sempit; dropdown Kelola di luar agar tidak terpotong. */}
          <nav aria-label="Menu utama" className="relative flex min-w-0 items-center gap-1 overflow-x-auto">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          {kelola.length > 0 && (
            <Dropdown label={<>Kelola <ChevronDown className="size-4" aria-hidden /></>}>
              {kelola.map((item) => (
                <NavLink key={item.to} to={item.to} role="menuitem" className={menuItemClass}>
                  {item.label}
                </NavLink>
              ))}
            </Dropdown>
          )}
        </div>

        {/* Logo dan kelompok kanan sama-sama melebar agar menu tepat di tengah halaman. */}
        <div className="ml-auto flex items-center gap-1 lg:flex-1 lg:justify-end">
          <Link to="/cari" aria-label="Pencarian" className="inline-flex size-11 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10 hover:text-white">
            <Search className="size-[22px]" aria-hidden />
          </Link>

          {user ? (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <Dropdown
                align="right"
                ariaLabel="Menu akun"
                label={
                  <span className="flex items-center gap-2 text-left">
                    <UserRound className="size-8 rounded-full bg-slate-100 p-1.5 text-slate-500" aria-hidden />
                    <span className="hidden leading-tight md:block">
                      <span className="block text-sm font-semibold text-slate-800">{user.nama}</span>
                      <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
                    </span>
                  </span>
                }
              >
                <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{user.instansi.nama}</div>
                <Link to="/profil" role="menuitem" className={menuItemClass}>
                  Profil Saya
                </Link>
                <button type="button" role="menuitem" onClick={logout} className={`${menuItemClass} flex items-center gap-2 text-red-600`}>
                  <LogOut className="size-4" aria-hidden /> Keluar
                </button>
              </Dropdown>
            </div>
          ) : (
            // Tombol putih: tombol biru (primary) akan tenggelam di atas header biru.
            <Link to="/masuk" className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-[15px] font-semibold sm:px-6 text-brand-900 transition-colors hover:bg-brand-50">
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
