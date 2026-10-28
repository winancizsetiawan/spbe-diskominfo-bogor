import { Suspense, useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useIdleLogout } from '@/auth/useIdleLogout'
import { Spinner } from '@/components/ui/Spinner'
import { Toaster } from '@/components/ui/Toaster'
import { Footer } from './Footer'
import { HalamanBoundary } from './HalamanBoundary'
import { Navbar } from './Navbar'
import { NoticeBanner } from './NoticeBanner'

export function AppLayout() {
  useIdleLogout()
  const { pathname } = useLocation()
  // Halaman masuk tampil sendiri tanpa navbar dan footer.
  const polos = pathname === '/masuk'
  const main = useRef<HTMLElement>(null)
  const sebelumnya = useRef(pathname)
  // Pindah halaman: fokus ke konten agar pembaca layar dan pengguna keyboard tidak tertinggal di menu.
  useEffect(() => {
    if (sebelumnya.current === pathname) return
    sebelumnya.current = pathname
    main.current?.focus({ preventScroll: true })
  }, [pathname])
  return (
    <div className={`flex min-h-screen flex-col ${polos ? 'bg-slate-100' : ''}`}>
      <a href="#konten-utama" className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-lg focus:translate-y-0">
        Lewati ke konten utama
      </a>
      {!polos && <Navbar />}
      {!polos && <NoticeBanner />}
      <main id="konten-utama" ref={main} tabIndex={-1} className={`mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none ${polos ? 'flex items-center' : ''}`}>
        <HalamanBoundary resetKey={pathname}>
          {/* Halaman dimuat per chunk; spinner tampil selama chunk-nya diunduh. */}
          <Suspense fallback={<Spinner className="py-24" />}>
            <Outlet />
          </Suspense>
        </HalamanBoundary>
      </main>
      {!polos && <Footer />}
      <Toaster />
      <ScrollRestoration />
    </div>
  )
}
