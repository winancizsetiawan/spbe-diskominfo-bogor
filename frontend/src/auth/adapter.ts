import { keycloakAdapter } from './keycloakAdapter'
import { lokalAdapter } from './lokalAdapter'
import { mockAdapter } from './mockAdapter'
import type { Role } from './types'

export interface AuthAdapter {
  /** Dipanggil sekali saat aplikasi dimuat; true bila ada sesi. */
  init(): Promise<boolean>
  hasSession(): boolean
  /** Token akses terkini; forceRefresh dipakai setelah API membalas 401. */
  getToken(forceRefresh?: boolean): Promise<string | null>
  login(returnTo?: string): void
  logout(): void
  /** Khusus mode demo: menyimpan peran aktif dan email akun. */
  loginAs?(role: Role, email?: string): void
  /** Menyimpan token sesi dari BE setelah login di halaman portal (mode lokal dan mock dengan BE). */
  loginToken?(token: string, kedaluwarsaPada: string): void
  /** Membuang token yang ditolak server (kedaluwarsa, server berganti rahasia) tanpa berpindah halaman. */
  lupakanSesi?(): void
}

// SSO adalah bawaan: build tanpa konfigurasi tidak boleh membuka login demo.
// - mock: pengembangan (akun demo; bila BE menerbitkan token sesi, token itu dipakai).
// - lokal: login di halaman portal (akun lokal, atau ASN dengan NIP dan kata sandi TND).
// - keycloak: SSO Keycloak.
export const authMode: 'mock' | 'lokal' | 'keycloak' =
  import.meta.env.VITE_AUTH_MODE === 'mock' ? 'mock' : import.meta.env.VITE_AUTH_MODE === 'lokal' ? 'lokal' : 'keycloak'

export const authAdapter: AuthAdapter =
  authMode === 'keycloak' ? keycloakAdapter : authMode === 'lokal' ? lokalAdapter : mockAdapter
