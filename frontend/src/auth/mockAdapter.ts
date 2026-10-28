import type { AuthAdapter } from './adapter'
import type { Role } from './types'

// Mode demo untuk pengembangan tanpa Keycloak. Hanya pilihan role yang disimpan
// di sessionStorage, dan hanya di mode ini; mode keycloak tidak menyimpan apa pun.
const KEY = 'spbe.demoRole'
let role: Role | null = null

function read(): Role | null {
  try {
    return sessionStorage.getItem(KEY) as Role | null
  } catch {
    return null
  }
}

export const mockAdapter: AuthAdapter = {
  async init() {
    role = read()
    return role !== null
  },
  hasSession() {
    return role !== null
  },
  async getToken() {
    return role ? `demo.${role}` : null
  },
  login(returnTo = '/beranda') {
    window.location.assign(`/masuk?kembali=${encodeURIComponent(returnTo)}`)
  },
  logout() {
    role = null
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // sessionStorage tidak tersedia; sesi tetap berakhir di memori
    }
    window.location.assign('/')
  },
  loginAs(next) {
    role = next
    try {
      sessionStorage.setItem(KEY, next)
    } catch {
      // tetap login untuk tab ini saja
    }
  },
}
