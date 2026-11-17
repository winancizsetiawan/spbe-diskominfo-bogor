import type { AuthAdapter } from './adapter'
import { bacaSesi, hapusSesi, simpanSesi } from './sesiToken'

/**
 * Mode "lokal": pengguna masuk lewat halaman login portal. BE memeriksa kata sandi (akun lokal) atau
 * meneruskannya ke TND (ASN dengan NIP), lalu menerbitkan token sesi bertanda tangan. Tanpa akun demo.
 */
export const lokalAdapter: AuthAdapter = {
  async init() {
    return bacaSesi() !== null
  },
  hasSession() {
    return bacaSesi() !== null
  },
  async getToken() {
    return bacaSesi()
  },
  login(returnTo = '/beranda') {
    window.location.assign(`/masuk?kembali=${encodeURIComponent(returnTo)}`)
  },
  logout() {
    hapusSesi()
    window.location.assign('/')
  },
  loginToken(token, kedaluwarsaPada) {
    simpanSesi(token, kedaluwarsaPada)
  },
  lupakanSesi() {
    hapusSesi()
  },
}
