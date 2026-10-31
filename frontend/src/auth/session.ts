import { create } from 'zustand'
import type { User } from './types'

type Status = 'loading' | 'anonymous' | 'authenticated'

/** belum_terdaftar: login SSO berhasil tetapi akun belum diundang ke portal. */
export type SessionNotice = 'belum_terdaftar' | null

interface SessionState {
  status: Status
  user: User | null
  notice: SessionNotice
  setUser(user: User | null, notice?: SessionNotice): void
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  user: null,
  notice: null,
  setUser: (user, notice = null) =>
    set({ user, notice, status: user ? 'authenticated' : 'anonymous' }),
}))
