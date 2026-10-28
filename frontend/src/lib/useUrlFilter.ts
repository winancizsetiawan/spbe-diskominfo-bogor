import { useSearchParams } from 'react-router'

/**
 * Filter, pencarian, dan nomor halaman disimpan di URL agar bisa dibagikan
 * dan tombol Back bekerja. Nilai kosong menghapus parameter.
 */
export function useUrlFilter() {
  const [params, setParams] = useSearchParams()
  const ubah = (next: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '') p.delete(key)
      else p.set(key, String(value))
    }
    setParams(p)
  }
  return [params, ubah] as const
}
