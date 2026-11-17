// Token sesi portal dari BE (login lewat halaman portal: akun lokal atau NIP + kata sandi TND).
// Disimpan di sessionStorage: hanya untuk tab ini dan hilang saat tab ditutup. Kata sandi tidak pernah disimpan.
const KUNCI = 'spbe.sesi'

interface Sesi {
  token: string
  /** ISO, dari kedaluwarsaPada BE. */
  exp: string
}

let sesi: Sesi | null = null

function berlaku(s: Sesi | null): s is Sesi {
  return !!s && new Date(s.exp).getTime() > Date.now() + 5_000
}

export function bacaSesi(): string | null {
  if (!sesi) {
    try {
      const raw = sessionStorage.getItem(KUNCI)
      sesi = raw ? (JSON.parse(raw) as Sesi) : null
    } catch {
      sesi = null
    }
  }
  if (!berlaku(sesi)) {
    hapusSesi()
    return null
  }
  return sesi.token
}

export function simpanSesi(token: string, kedaluwarsaPada: string) {
  sesi = { token, exp: kedaluwarsaPada }
  try {
    sessionStorage.setItem(KUNCI, JSON.stringify(sesi))
  } catch {
    // sessionStorage tidak tersedia: sesi tetap berlaku di memori tab ini
  }
}

export function hapusSesi() {
  sesi = null
  try {
    sessionStorage.removeItem(KUNCI)
  } catch {
    // abaikan
  }
}
