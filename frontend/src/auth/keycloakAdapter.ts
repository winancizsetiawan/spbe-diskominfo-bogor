import type Keycloak from 'keycloak-js'
import type { AuthAdapter } from './adapter'

let kc: Keycloak | null = null

// keycloak-js hanya diunduh di mode SSO; mode demo tidak pernah memuatnya.
async function client() {
  if (!kc) {
    const { default: KeycloakClient } = await import('keycloak-js')
    kc = new KeycloakClient({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    })
  }
  return kc
}

// Authorization Code + PKCE. Token hanya disimpan di memori keycloak-js,
// tidak di localStorage dan tidak di URL (Buku Panduan: manajemen sesi).
export const keycloakAdapter: AuthAdapter = {
  async init() {
    return (await client()).init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    })
  },
  hasSession() {
    return !!kc?.authenticated
  },
  async getToken(forceRefresh = false) {
    if (!kc?.authenticated) return null
    try {
      await kc.updateToken(forceRefresh ? -1 : 30)
    } catch {
      return null
    }
    return kc.token ?? null
  },
  login(returnTo = '/beranda') {
    void client().then((k) => k.login({ redirectUri: window.location.origin + returnTo }))
  },
  logout() {
    void client().then((k) => k.logout({ redirectUri: window.location.origin }))
  },
}
