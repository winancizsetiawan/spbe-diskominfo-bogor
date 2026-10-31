import type { AksiAktivitas } from '@/features/profil/types'

export interface AktivitasRow {
  id: number
  /** Null untuk kejadian sebelum pengguna dikenali, mis. percobaan masuk dengan akun yang tidak ada. */
  idUser: number | null
  aksi: AksiAktivitas
  deskripsi: string
  waktu: string
  ipAddress: string | null
  hasil: 'berhasil' | 'gagal'
}

const jamLalu = (jam: number) => new Date(Date.now() - jam * 3_600_000).toISOString()
const IP = '180.244.132.84'

// Riwayat aktivitas (Revisi 5.12). Data sensitif tidak pernah dicatat.
export const aktivitas: AktivitasRow[] = [
  { id: 1, idUser: 1, aksi: 'login', deskripsi: 'Login SSO terpusat', waktu: jamLalu(1), ipAddress: IP, hasil: 'berhasil' },
  { id: 2, idUser: 1, aksi: 'unduh', deskripsi: 'Mengunduh Peraturan Presiden No. 95 Tahun 2018 tentang SPBE', waktu: jamLalu(20), ipAddress: null, hasil: 'berhasil' },
  { id: 3, idUser: 1, aksi: 'balasan', deskripsi: 'Membalas thread: Rekomendasi tools open source untuk arsitektur domain', waktu: jamLalu(29), ipAddress: null, hasil: 'berhasil' },
  { id: 4, idUser: 1, aksi: 'login', deskripsi: 'Login SSO terpusat', waktu: jamLalu(30), ipAddress: IP, hasil: 'berhasil' },
  { id: 5, idUser: 1, aksi: 'login', deskripsi: 'Percobaan masuk gagal: kata sandi salah', waktu: jamLalu(78), ipAddress: '36.72.14.201', hasil: 'gagal' },
  { id: 6, idUser: 1, aksi: 'unduh', deskripsi: 'Mengunduh SOP Keamanan Informasi', waktu: jamLalu(80), ipAddress: null, hasil: 'berhasil' },
  { id: 7, idUser: 2, aksi: 'login', deskripsi: 'Login SSO terpusat', waktu: jamLalu(4), ipAddress: IP, hasil: 'berhasil' },
  { id: 8, idUser: 3, aksi: 'login', deskripsi: 'Login SSO terpusat', waktu: jamLalu(2), ipAddress: IP, hasil: 'berhasil' },
  { id: 9, idUser: 3, aksi: 'unduh', deskripsi: 'Mengunduh Template RAA Aplikasi Pemerintah', waktu: jamLalu(23), ipAddress: null, hasil: 'berhasil' },
  { id: 10, idUser: 4, aksi: 'login', deskripsi: 'Login SSO terpusat', waktu: jamLalu(1), ipAddress: IP, hasil: 'berhasil' },
  { id: 11, idUser: null, aksi: 'login', deskripsi: 'Percobaan masuk gagal: akun tidak terdaftar', waktu: jamLalu(10), ipAddress: '103.28.12.77', hasil: 'gagal' },
  { id: 12, idUser: null, aksi: 'login', deskripsi: 'Percobaan masuk gagal: akun tidak terdaftar', waktu: jamLalu(10), ipAddress: '103.28.12.77', hasil: 'gagal' },
  { id: 13, idUser: 2, aksi: 'akses_ditolak', deskripsi: 'Membuka Validasi Data tanpa hak akses', waktu: jamLalu(15), ipAddress: IP, hasil: 'gagal' },
  { id: 14, idUser: 3, aksi: 'aplikasi', deskripsi: 'Mengubah data aplikasi SIMRS Rujukan', waktu: jamLalu(26), ipAddress: null, hasil: 'berhasil' },
  { id: 15, idUser: 3, aksi: 'validasi', deskripsi: 'Mengajukan validasi: e-Office', waktu: jamLalu(27), ipAddress: null, hasil: 'berhasil' },
  { id: 16, idUser: 4, aksi: 'dokumen', deskripsi: 'Mengunggah dokumen: Draf Pedoman Klasifikasi RAA', waktu: jamLalu(48), ipAddress: null, hasil: 'berhasil' },
  { id: 17, idUser: 4, aksi: 'moderasi', deskripsi: 'Menyembunyikan balasan yang dilaporkan', waktu: jamLalu(52), ipAddress: null, hasil: 'berhasil' },
  { id: 18, idUser: 4, aksi: 'backup', deskripsi: 'Backup otomatis harian selesai', waktu: jamLalu(20), ipAddress: null, hasil: 'berhasil' },
]

let seq = aktivitas.length

export function catatAktivitas(
  idUser: number | null,
  aksi: AksiAktivitas,
  deskripsi: string,
  hasil: AktivitasRow['hasil'] = 'berhasil',
) {
  aktivitas.push({ id: ++seq, idUser, aksi, deskripsi, waktu: new Date().toISOString(), ipAddress: null, hasil })
}
