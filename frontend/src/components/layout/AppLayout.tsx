import { Suspense, useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { useIdleLogout } from '@/auth/useIdleLogout'
import { Spinner } from '@/components/ui/Spinner'
import { Toaster } from '@/components/ui/Toaster'
import { Footer } from './Footer'
import { HalamanBoundary } from './HalamanBoundary'
import { Navbar } from './Navbar'
import { NoticeBanner } from './NoticeBanner'
import { SidebarShell } from './Sidebar'

export function AppLayout() {
  useIdleLogout()
  const { user } = useAuth()
  const { pathname } = useLocation()
  // Halaman masuk tampil sendiri tanpa navbar dan footer.
  const polos = pathname === '/masuk'
  // Pengguna yang sudah masuk memakai menu samping kiri; pengunjung tetap memakai menu atas (DESIGN.md bagian 5).
  const internal = !!user && !polos
  const main = useRef<HTMLElement>(null)
  const sebelumnya = useRef(pathname)
  // Pindah halaman: fokus ke konten agar pembaca layar dan pengguna keyboard tidak tertinggal di menu.
  useEffect(() => {
    if (sebelumnya.current === pathname) return
    sebelumnya.current = pathname
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  const konten = (
    <main
      id="konten-utama"
      ref={main}
      tabIndex={-1}
      className={`mx-auto w-full flex-1 px-4 py-8 focus:outline-none ${internal ? 'max-w-7xl lg:px-8' : 'max-w-6xl'} ${polos ? 'flex items-center' : ''}`}
    >
      <HalamanBoundary resetKey={pathname}>
        {/* Halaman dimuat per chunk; spinner tampil selama chunk-nya diunduh. */}
        <Suspense fallback={<Spinner className="py-24" />}>
          <Outlet />
        </Suspense>
      </HalamanBoundary>
    </main>
  )

  const lewati = (
    <a href="#konten-utama" className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-lg focus:translate-y-0">
      Lewati ke konten utama
    </a>
  )

  if (internal) {
    return (
      <>
        {lewati}
        <SidebarShell>
          <NoticeBanner />
          {konten}
        </SidebarShell>
        <Toaster />
        <ScrollRestoration />
      </>
    )
  }

  return (
    // Halaman publik: gradien lembut biru muda di atas yang memudar ke warna latar aplikasi (pilihan latar nomor 2).
    <div
      className={`flex min-h-screen flex-col ${
        polos ? 'bg-latar' : 'bg-latar bg-[linear-gradient(180deg,#D9E1F0_0px,#E3E8F1_520px,var(--color-latar)_1100px)]'
      }`}
    >
      {lewati}
      {!polos && <Navbar />}
      {!polos && <NoticeBanner />}
      {konten}
      {!polos && <Footer />}
      <Toaster />
      <ScrollRestoration />
    </div>
  )
}
