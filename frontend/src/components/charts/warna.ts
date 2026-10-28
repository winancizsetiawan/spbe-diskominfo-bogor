/** Warna grafik; dipilih agar tetap terbedakan dan tidak mengandalkan warna saja (selalu disertai legenda dan tabel data). */
export const WARNA = {
  brand: '#3b4fc4',
  hijau: '#10b981',
  kuning: '#f59e0b',
  merah: '#ef4444',
  ungu: '#8b5cf6',
  abu: '#94a3b8',
} as const

/** Batas atas sumbu: kelipatan 4 agar empat garis bantu bernilai bulat. */
export function batasAtas(maks: number) {
  if (maks <= 4) return 4
  return Math.ceil(maks / 4) * 4
}
