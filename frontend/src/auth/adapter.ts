import { keycloakAdapter } from './keycloakAdapter'
import { mockAdapter } from './mockAdapter'
import type { Role } from './types'

export interface AuthAdapter {
  /** Dipanggil sekali saat aplikasi dimuat; true bila ada sesi SSO. */
  init(): Promise<boolean>
  hasSession(): boolean
  /** Token akses terkini; forceRefresh dipakai setelah API membalas 401. */
  getToken(forceRefresh?: boolean): Promise<string | null>
  login(returnTo?: string): void
  logout(): void
  /** Khusus mode demo. */
  loginAs?(role: Role): void
}

// SSO adalah bawaan: build tanpa konfigurasi tidak boleh membuka login demo.
// Mode demo hanya aktif bila diminta eksplisit (VITE_AUTH_MODE=mock, lihat .env.development).
export const authMode: 'mock' | 'keycloak' =
  import.meta.env.VITE_AUTH_MODE === 'mock' ? 'mock' : 'keycloak'

export const authAdapter: AuthAdapter = authMode === 'keycloak' ? keycloakAdapter : mockAdapter
