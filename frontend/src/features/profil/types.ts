import type { Role } from '@/auth/types'

export interface ProfilSaya {
  nama: string
  email: string
  nip: string
  jabatan: string
  golongan: string
  satkerInduk: string
  /** Opsional; satu-satunya data profil yang dapat diubah di portal. */
  noTelepon: string | null
  instansi: { id: number; nama: string }
  role: Role
  statistik: { dokumenDiunduh: number; diskusiForum: number }
}

export interface PreferensiNotifikasi {
  /** Notifikasi di portal selalu aktif; hanya kanal email yang dapat diatur. */
  kanalEmail: boolean
}

export type AksiAktivitas =
  | 'login'
  | 'unduh'
  | 'thread'
  | 'balasan'
  | 'laporan'
  | 'ubah_profil'
  | 'ubah_preferensi'
  | 'kelola_pengguna'
  | 'akses_ditolak'
  | 'moderasi'
  | 'dokumen'
  | 'aplikasi'
  | 'flowchart'
  | 'validasi'
  | 'backup'
  | 'periode'

export interface Aktivitas {
  id: number
  aksi: AksiAktivitas
  deskripsi: string
  waktu: string
  /** Hanya terisi untuk login. */
  ipAddress: string | null
  hasil: 'berhasil' | 'gagal'
}

export const AKSI_LABEL: Record<AksiAktivitas, string> = {
  login: 'Masuk',
  unduh: 'Unduh dokumen',
  thread: 'Thread forum',
  balasan: 'Balasan forum',
  laporan: 'Laporan konten',
  ubah_profil: 'Ubah profil',
  ubah_preferensi: 'Ubah preferensi',
  kelola_pengguna: 'Kelola pengguna',
  akses_ditolak: 'Akses ditolak',
  moderasi: 'Moderasi forum',
  dokumen: 'Kelola dokumen',
  aplikasi: 'Data aplikasi',
  flowchart: 'Flowchart',
  validasi: 'Validasi data',
  backup: 'Backup',
  periode: 'Periode pembaruan',
}

/** Nomor seluler Indonesia: 08xx atau +628xx, 10–13 digit tanpa kode negara awalan nol. */
export const POLA_TELEPON = /^(\+62|0)8\d{8,11}$/

/** Hilangkan spasi, tanda hubung, dan titik agar "0812 3456-7890" dianggap sama dengan "081234567890". */
export function normalisasiTelepon(nilai: string) {
  return nilai.replace(/[\s\-.]/g, '')
}
