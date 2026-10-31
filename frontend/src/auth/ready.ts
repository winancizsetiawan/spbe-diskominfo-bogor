import { authAdapter } from './adapter'

/**
 * Inisialisasi sesi SSO, dijalankan sekali saat modul dimuat. Request API menunggu
 * promise ini supaya halaman publik (yang tampil berbeda untuk pengguna login) tidak
 * mengirim request pertamanya tanpa token lalu menyimpan hasil anonim di cache.
 */
export const authReady: Promise<boolean> = authAdapter.init().catch(() => false)
