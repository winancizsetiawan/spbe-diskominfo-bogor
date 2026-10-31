const tanggalFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const relatifFormat = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })
const angkaFormat = new Intl.NumberFormat('id-ID')

const SATUAN: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function formatTanggal(iso: string) {
  return tanggalFormat.format(new Date(iso))
}

const waktuLengkapFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** Format Buku Panduan untuk log: dd/mm/yyyy hh:mm:ss. */
export function formatWaktuLengkap(iso: string) {
  return waktuLengkapFormat.format(new Date(iso)).replace(',', '')
}

export function formatTanggalSingkat(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(iso))
}

const hariBulanFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

/** Sumbu grafik: "28 Okt". Menerima ISO penuh atau tanggal YYYY-MM-DD. */
export function formatHariBulan(iso: string) {
  return hariBulanFormat.format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso))
}

export function formatUkuran(mb: number) {
  return mb < 1 ? `${Math.round(mb * 1024)} KB` : `${mb.toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`
}

export function waktuRelatif(iso: string) {
  const detik = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [satuan, besar] of SATUAN) {
    if (Math.abs(detik) >= besar) return relatifFormat.format(Math.round(detik / besar), satuan)
  }
  return 'baru saja'
}

export function formatAngka(n: number) {
  return angkaFormat.format(n)
}
