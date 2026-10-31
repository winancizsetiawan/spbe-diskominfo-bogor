import { useEffect } from 'react'
import { authAdapter } from './adapter'
import { useSession } from './session'

// Buku Panduan: auto logout setelah 10–15 menit tidak aktif.
const IDLE_MS = 15 * 60 * 1000
const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

export function useIdleLogout() {
  const authenticated = useSession((s) => s.status === 'authenticated')

  useEffect(() => {
    if (!authenticated) return
    let timer = window.setTimeout(authAdapter.logout, IDLE_MS)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(authAdapter.logout, IDLE_MS)
    }
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [authenticated])
}
