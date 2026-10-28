/** Hanya izinkan redirect ke path internal, untuk mencegah open redirect setelah login. */
export function safeReturn(path: string | null, fallback = '/beranda') {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return fallback
  }
  return path
}
