import { useEffect, type ReactNode } from 'react'
import { api, ApiError } from '@/api/client'
import { authReady } from './ready'
import { useSession } from './session'
import type { User } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useSession((s) => s.setUser)

  useEffect(() => {
    let cancelled = false
    void authReady.then(async (hasSession) => {
      if (!hasSession) {
        if (!cancelled) setUser(null)
        return
      }
      try {
        const user = await api<User>('/me')
        if (!cancelled) setUser(user)
      } catch (err) {
        // 404 = akun SSO belum diundang ke portal: akses publik + pesan (K5)
        const notice = err instanceof ApiError && err.status === 404 ? 'belum_terdaftar' : null
        if (!cancelled) setUser(null, notice)
      }
    })
    return () => {
      cancelled = true
    }
  }, [setUser])

  return children
}
