import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Sama dengan batasan tipe React.lazy: props tiap halaman dipertahankan lewat M[K].
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Komponen = ComponentType<any>

/**
 * Muat halaman saat pertama kali dibuka sehingga tiap halaman menjadi chunk sendiri
 * dan bundle awal tetap kecil. Contoh: `halaman(() => import('./x/XPage'), 'XPage')`.
 */
export function halaman<M extends Record<K, Komponen>, K extends string>(
  muat: () => Promise<M>,
  nama: K,
): LazyExoticComponent<M[K]> {
  return lazy(() => muat().then((modul) => ({ default: modul[nama] })))
}
