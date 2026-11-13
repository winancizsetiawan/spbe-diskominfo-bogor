import {
  AppWindow, BadgeCheck, CalendarClock, ChartColumn, CircleHelp, ClipboardList, DatabaseBackup, FileText,
  FolderOpen, GraduationCap, History, House, LayoutDashboard, LogOut, Menu, MessageSquareText, MessagesSquare,
  Network, Newspaper, Search, ShieldAlert, UserRound, Users, Workflow, X, type LucideIcon,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { SIDEBAR_NAV } from '@/app/navigation'
import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Dropdown, menuItemClass } from '@/components/ui/Dropdown'
import { TAHUN_PEMBANGUNAN } from './Hakcipta'
import { NotificationBell } from './NotificationBell'

const IKON: Record<string, LucideIcon> = {
  '/beranda': House,
  '/dokumen': FileText,
  '/sop': ClipboardList,
  '/pembelajaran': GraduationCap,
  '/forum': MessagesSquare,
  '/dasbor/analitik': ChartColumn,
  '/katalog/aplikasi': AppWindow,
  '/katalog/raa': Network,
  '/katalog/flowchart': Workflow,
  '/katalog/dasbor': LayoutDashboard,
  '/admin/pengguna': Users,
  '/admin/validasi': BadgeCheck,
  '/admin/repositori': FolderOpen,
  '/admin/moderasi': ShieldAlert,
  '/admin/periode': CalendarClock,
  '/admin/audit': History,
  '/admin/backup': DatabaseBackup,
  '/admin/kritik': MessageSquareText,
  '/berita': Newspaper,
  '/bantuan': CircleHelp,
}

// Tab aktif: satu bentuk berwarna latar aplikasi (--color-latar) yang menyatu dengan area konten (DESIGN.md 6.2)
// dan bergeser ke menu yang baru dibuka. ::before dan ::after membentuk lengkungan cekung 28px di atas dan
// bawah ujung kanannya: kotak 28px berisi warna konten dengan lingkaran transparan di sudut yang menghadap menu.
// Peralihan 1px di tepi lingkaran = anti-alias, agar lengkungan halus dan tidak bergerigi.
const LENGKUNG_ATAS =
  'before:pointer-events-none before:absolute before:right-0 before:-top-7 before:size-7 before:bg-[radial-gradient(circle_at_0_0,transparent_27px,var(--color-latar)_28px)]'
const LENGKUNG_BAWAH =
  'after:pointer-events-none after:absolute after:right-0 after:-bottom-7 after:size-7 after:bg-[radial-gradient(circle_at_0_100%,transparent_27px,var(--color-latar)_28px)]'

// Tautan tidak menggambar latar aktif sendiri; tab yang bergeser ada di bawahnya. Ketebalan huruf tetap
// agar teks tidak bergeser saat aktif berpindah; hanya warnanya yang berganti perlahan.
const itemClass = ({ isActive }: { isActive: boolean }) =>
  `relative z-10 flex min-h-12 items-center gap-3 rounded-l-full py-2 pr-3 pl-4 text-sm font-medium transition-colors duration-300 ${
    isActive ? 'text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white'
  }`

interface PosisiTab {
  top: number
  left: number
  height: number
}

/** Ukur posisi tautan aktif di dalam menu; dihitung ulang saat pindah halaman atau ukuran menu berubah. */
function usePosisiTab(nav: RefObject<HTMLElement | null>, pathname: string) {
  const [posisi, setPosisi] = useState<PosisiTab | null>(null)

  useLayoutEffect(() => {
    const el = nav.current
    if (!el) return
    const ukur = () => {
      const aktif = el.querySelector<HTMLElement>('a[aria-current="page"]')
      setPosisi(aktif ? { top: aktif.offsetTop, left: aktif.offsetLeft, height: aktif.offsetHeight } : null)
    }
    ukur()
    // Pantau juga tiap daftar menu: muatnya font atau perubahan izin bisa menggeser tautan tanpa mengubah ukuran menu.
    const ro = new ResizeObserver(ukur)
    ro.observe(el)
    el.querySelectorAll('ul').forEach((ul) => ro.observe(ul))
    return () => ro.disconnect()
  }, [nav, pathname])

  return posisi
}

function IsiMenu() {
  const { can } = useAuth()
  const { pathname } = useLocation()
  const nav = useRef<HTMLElement>(null)
  const posisi = usePosisiTab(nav, pathname)
  // Animasi baru dinyalakan setelah posisi pertama terpasang, agar tab tidak meluncur dari atas saat menu pertama tampil.
  const [siap, setSiap] = useState(false)
  useEffect(() => {
    if (posisi && !siap) requestAnimationFrame(() => setSiap(true))
  }, [posisi, siap])

  // Notifikasi, Profil, dan Pencarian tidak ada di sini: sudah ada di bilah atas (lonceng, menu akun, kaca pembesar).
  const grup = SIDEBAR_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(i.perm)) })).filter((g) => g.items.length)

  return (
    <div className="flex h-full flex-col">
      <Link to="/beranda" className="flex items-center gap-2.5 px-5 py-5" aria-label="Ke beranda">
        <img src="/logo bogor.png" alt="Logo Pemerintah Kota Bogor" className="h-10 w-10" />
        <span className="leading-tight">
          <span className="block text-lg font-bold text-white">SPBE</span>
          <span className="block text-xs text-brand-100">Pemerintah Kota Bogor</span>
        </span>
      </Link>

      <nav
        ref={nav}
        aria-label="Menu samping"
        // relative: tab aktif diposisikan terhadap menu dan ikut tergulir bersama isinya.
        // Scrollbar disembunyikan (tetap bisa digulir): batang scrollbar di tepi kanan akan memutus tab aktif dari area konten.
        className="relative flex-1 space-y-5 overflow-y-auto py-2 pl-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute top-0 right-0 rounded-l-full bg-latar ${LENGKUNG_ATAS} ${LENGKUNG_BAWAH} ${
            siap ? 'transition-[translate,height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
          } ${posisi ? 'opacity-100' : 'opacity-0'}`}
          style={posisi ? { translate: `0 ${posisi.top}px`, left: posisi.left, height: posisi.height } : undefined}
        />
        {grup.map((g) => (
          <div key={g.judul}>
            <p className="mb-1 px-4 text-xs font-semibold tracking-wider text-brand-200 uppercase">{g.judul}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Ikon = IKON[item.to]
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} className={itemClass}>
                      {Ikon && <Ikon className="size-4.5 shrink-0" aria-hidden />}
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="border-t border-white/10 px-5 py-3 text-xs leading-relaxed text-brand-200">
        © {TAHUN_PEMBANGUNAN} Pemerintah Kota Bogor
        <br />
        Hak cipta dilindungi.
      </p>
    </div>
  )
}

/** Bilah atas area konten: judul ringkas di HP, pencarian, notifikasi, dan menu akun. */
function BilahAtas({ onBukaMenu }: { onBukaMenu(): void }) {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={onBukaMenu}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-700 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="size-5" aria-hidden /> Menu
      </button>
      <div className="ml-auto flex items-center gap-1">
        <Link to="/cari" aria-label="Pencarian" className="inline-flex size-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-brand-700">
          <Search className="size-5" aria-hidden />
        </Link>
        <NotificationBell />
        <Dropdown
          align="right"
          ariaLabel="Menu akun"
          label={
            <span className="flex items-center gap-2 text-left">
              <UserRound className="size-8 rounded-full bg-slate-100 p-1.5 text-slate-500" aria-hidden />
              <span className="hidden leading-tight sm:block">
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
    </header>
  )
}

/** Kerangka halaman internal: menu samping kiri di desktop, laci dari tombol Menu di HP. */
export function SidebarShell({ children }: { children: ReactNode }) {
  const [laci, setLaci] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setLaci(false), [pathname])
  useEffect(() => {
    if (!laci) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLaci(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [laci])

  return (
    <div className="flex min-h-screen bg-latar">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-brand-900 lg:block">
        <IsiMenu />
      </aside>

      {laci && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setLaci(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-brand-900 shadow-xl">
            <button
              type="button"
              onClick={() => setLaci(false)}
              aria-label="Tutup menu"
              className="absolute top-4 right-3 inline-flex size-11 items-center justify-center rounded-md text-brand-100 hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
            <IsiMenu />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <BilahAtas onBukaMenu={() => setLaci(true)} />
        {children}
      </div>
    </div>
  )
}
