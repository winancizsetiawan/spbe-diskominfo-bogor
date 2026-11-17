import type { AuthAdapter } from './adapter'
import type { Role } from './types'

// Mode demo untuk pengembangan tanpa Keycloak. Hanya pilihan role yang disimpan
// di sessionStorage, dan hanya di mode ini; mode keycloak tidak menyimpan apa pun.
const KEY_ROLE = 'spbe.demoRole'
const KEY_EMAIL = 'spbe.demoEmail'
let role: Role | null = null
let email: string | null = null

function readRole(): Role | null {
  try {
    return sessionStorage.getItem(KEY_ROLE) as Role | null
  } catch {
    return null
  }
}

function readEmail(): string | null {
  try {
    return sessionStorage.getItem(KEY_EMAIL)
  } catch {
    return null
  }
}

export const mockAdapter: AuthAdapter = {
  async init() {
    role = readRole()
    email = readEmail()
    return role !== null
  },
  hasSession() {
    return role !== null
  },
  async getToken() {
    if (!role) return null
    return email ? `demo.${role}:${email}` : `demo.${role}`
  },
  login(returnTo = '/beranda') {
    window.location.assign(`/masuk?kembali=${encodeURIComponent(returnTo)}`)
  },
  logout() {
    role = null
    email = null
    try {
      sessionStorage.removeItem(KEY_ROLE)
      sessionStorage.removeItem(KEY_EMAIL)
    } catch {
      // sessionStorage tidak tersedia; sesi tetap berakhir di memori
    }
    window.location.assign('/')
  },
  loginAs(nextRole, nextEmail) {
    role = nextRole
    if (nextEmail !== undefined) email = nextEmail || null
    try {
      sessionStorage.setItem(KEY_ROLE, nextRole)
      if (nextEmail !== undefined) {
        if (nextEmail) sessionStorage.setItem(KEY_EMAIL, nextEmail)
        else sessionStorage.removeItem(KEY_EMAIL)
      }
    } catch {
      // tetap login untuk tab ini saja
    }
  },
}
