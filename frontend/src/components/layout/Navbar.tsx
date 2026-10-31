import { ChevronDown, LogOut, Search, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { INTERNAL_NAV, KELOLA_NAV, PUBLIC_NAV } from '@/app/navigation'
import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { buttonClass } from '@/components/ui/Button'
import { Dropdown, menuItemClass } from '@/components/ui/Dropdown'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-brand-700'
  }`

export function Navbar() {
  const { user, can, logout } = useAuth()
  const items = user ? INTERNAL_NAV : PUBLIC_NAV
  const kelola = KELOLA_NAV.filter((item) => item.perm && can(item.perm))

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to={user ? '/beranda' : '/'} aria-label="Ke beranda" className="md:flex-1">
          <Logo />
        </Link>

        {/* Di layar sempit menu pindah ke baris sendiri agar tidak terpotong di samping logo dan akun. */}
        <div className="order-last flex min-w-0 basis-full items-center gap-1 md:order-none md:basis-auto md:flex-none md:justify-center">
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
        <div className="ml-auto flex items-center gap-1 md:flex-1 md:justify-end">
          <Link to="/cari" aria-label="Pencarian" className="inline-flex size-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-brand-700">
            <Search className="size-5" aria-hidden />
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
            <Link to="/masuk" className={buttonClass('primary')}>
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
