/** Hanya izinkan redirect ke path internal, untuk mencegah open redirect setelah login. */
export function safeReturn(path: string | null, fallback = '/beranda') {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return fallback
  }
  // Kembali ke halaman login sendiri hanya membuat alamat bertumpuk (/masuk?kembali=/masuk?kembali=...).
  if (path === '/masuk' || path.startsWith('/masuk?') || path.startsWith('/masuk/')) return fallback
  return path
}
