import type { Role } from '@/auth/types'
import type { AksiAktivitas } from '@/features/profil/types'

export interface Halaman<T> {
  items: T[]
  page: number
  totalPages: number
  total: number
}

// ---- Audit Trail (Revisi 5.12) ----

export type KategoriAudit = 'aktivitas' | 'keamanan'
export type FilterKategoriAudit = 'semua' | KategoriAudit
export type HasilAudit = 'berhasil' | 'gagal'

export interface AuditLog {
  id: number
  waktu: string
  /** Null untuk kejadian sebelum pengguna dikenali, mis. masuk dengan akun yang tidak terdaftar. */
  pengguna: { nama: string; email: string; role: Role } | null
  kategori: KategoriAudit
  aksi: AksiAktivitas
  hasil: HasilAudit
  deskripsi: string
  ipAddress: string | null
}

export interface AuditFilter {
  page: number
  kategori: FilterKategoriAudit
  aksi?: AksiAktivitas
  hasil?: HasilAudit
  q?: string
  /** YYYY-MM-DD, inklusif. */
  dari?: string
  sampai?: string
}

export interface DaftarAudit extends Halaman<AuditLog> {
  hitungan: Record<FilterKategoriAudit, number>
}

export const KATEGORI_AUDIT_LABEL: Record<FilterKategoriAudit, string> = {
  semua: 'Semua',
  aktivitas: 'Aktivitas',
  keamanan: 'Keamanan',
}

/** Kejadian keamanan: login gagal dan akses ditolak. Sisanya, termasuk backup gagal, adalah aktivitas. */
export const kategoriAudit = (aksi: AksiAktivitas, hasil: HasilAudit): KategoriAudit =>
  aksi === 'akses_ditolak' || (aksi === 'login' && hasil === 'gagal') ? 'keamanan' : 'aktivitas'

// ---- Backup (Revisi 5.14) ----

export type TipeBackup = 'otomatis' | 'manual'
export type StatusBackup = 'berjalan' | 'berhasil' | 'gagal'

export interface RiwayatBackup {
  id: number
  tipe: TipeBackup
  status: StatusBackup
  ukuranMb: number | null
  /** Nama Super Admin pemicu; null untuk penjadwal. */
  oleh: string | null
  waktu: string
  /** Hanya terisi saat gagal; ringkas dan tanpa detail sistem. */
  pesanGagal: string | null
}

export interface DaftarBackup {
  items: RiwayatBackup[]
  jadwal: string
  /** Jumlah backup terakhir yang disimpan; yang lebih lama dihapus otomatis. */
  retensi: number
  terakhirBerhasil: string | null
}

export const STATUS_BACKUP: Record<StatusBackup, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  berjalan: { label: 'Berjalan', tone: 'warning' },
  berhasil: { label: 'Berhasil', tone: 'success' },
  gagal: { label: 'Gagal', tone: 'danger' },
}

/** Backup harian dianggap terlambat bila yang berhasil terakhir lebih tua dari ini. */
export const BATAS_BACKUP_TERLAMBAT_JAM = 26

// ---- Periode Pembaruan Data (Revisi 5.16, K19) ----

export type StatusPeriode = 'akan_datang' | 'berjalan' | 'selesai'

export interface PengingatPeriode {
  hariSebelum: number
  /** YYYY-MM-DD */
  tanggal: string
  terkirim: boolean
}

export interface Periode {
  id: number
  nama: string
  /** YYYY-MM-DD */
  tanggalMulai: string
  tenggat: string
  status: StatusPeriode
  pengingat: PengingatPeriode[]
  dibuatOleh: string
}

export interface InstansiTertinggal {
  instansi: string
  /** Jumlah aplikasi yang belum berstatus Disetujui. */
  jumlah: number
}

export interface DaftarPeriode {
  items: Periode[]
  /** Admin OPD yang akan menerima pengingat karena datanya belum Disetujui. */
  tertinggal: InstansiTertinggal[]
}

export interface PeriodeInput {
  nama: string
  tanggalMulai: string
  tenggat: string
}

export const BATAS_PERIODE = { namaMin: 3, namaMax: 100 }

/** Pengingat otomatis ke Admin OPD: H-7, H-3, dan H-1 sebelum tenggat. */
export const HARI_PENGINGAT = [7, 3, 1] as const

export const STATUS_PERIODE: Record<StatusPeriode, { label: string; tone: 'brand' | 'success' | 'neutral' }> = {
  akan_datang: { label: 'Akan datang', tone: 'brand' },
  berjalan: { label: 'Berjalan', tone: 'success' },
  selesai: { label: 'Selesai', tone: 'neutral' },
}

/** Tanggal lokal hari ini sebagai YYYY-MM-DD (tanggal periode adalah tanggal kalender, bukan waktu). */
export function hariIni(sekarang = new Date()) {
  const bulan = String(sekarang.getMonth() + 1).padStart(2, '0')
  const hari = String(sekarang.getDate()).padStart(2, '0')
  return `${sekarang.getFullYear()}-${bulan}-${hari}`
}

export function geser(tanggal: string, hari: number) {
  const d = new Date(`${tanggal}T00:00:00`)
  d.setDate(d.getDate() + hari)
  return hariIni(d)
}

export function statusPeriode(p: Pick<Periode, 'tanggalMulai' | 'tenggat'>, sekarang = hariIni()): StatusPeriode {
  if (sekarang < p.tanggalMulai) return 'akan_datang'
  return sekarang > p.tenggat ? 'selesai' : 'berjalan'
}

export function pengingatDari(tenggat: string, sekarang = hariIni()): PengingatPeriode[] {
  return HARI_PENGINGAT.map((hariSebelum) => {
    const tanggal = geser(tenggat, -hariSebelum)
    return { hariSebelum, tanggal, terkirim: tanggal <= sekarang }
  })
}

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/
const tanggalValid = (v: string) => TANGGAL.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())

/** Validasi bersama FE dan mock; server tetap memeriksa ulang. Periode lain dipakai untuk memeriksa tumpang tindih. */
export function validasiPeriode(input: PeriodeInput, lain: Periode[], sekarang = hariIni()): Partial<Record<keyof PeriodeInput, string>> {
  const errors: Partial<Record<keyof PeriodeInput, string>> = {}
  const nama = input.nama.trim()
  if (nama.length < BATAS_PERIODE.namaMin || nama.length > BATAS_PERIODE.namaMax)
    errors.nama = `Nama periode harus ${BATAS_PERIODE.namaMin}–${BATAS_PERIODE.namaMax} karakter.`
  else if (lain.some((p) => p.nama.toLowerCase() === nama.toLowerCase())) errors.nama = 'Nama periode sudah dipakai.'

  if (!tanggalValid(input.tanggalMulai)) errors.tanggalMulai = 'Isi tanggal mulai.'
  if (!tanggalValid(input.tenggat)) errors.tenggat = 'Isi tenggat.'
  if (errors.tanggalMulai || errors.tenggat) return errors

  if (input.tenggat <= input.tanggalMulai) errors.tenggat = 'Tenggat harus setelah tanggal mulai.'
  else if (input.tenggat < sekarang) errors.tenggat = 'Tenggat tidak boleh sudah lewat.'
  else {
    const bentrok = lain.find((p) => input.tanggalMulai <= p.tenggat && input.tenggat >= p.tanggalMulai)
    if (bentrok) errors.tanggalMulai = `Rentang tanggal bertumpuk dengan periode "${bentrok.nama}".`
  }
  return errors
}
