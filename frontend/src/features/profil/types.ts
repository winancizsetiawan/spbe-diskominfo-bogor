import type { Role } from '@/auth/types'

export interface InstansiProfilOption {
  id: number
  nama: string
}

export interface UbahDataPegawaiInput {
  nama: string
  nip: string
  idInstansi: number
  satkerInduk: string
  jabatan: string
  golongan: string
  email: string
}

export interface UbahDataPegawaiResponse {
  profil: ProfilSaya
  user: import('@/auth/types').User
  token?: string
  kedaluwarsaPada?: string
}

export interface ProfilSaya {
  nama: string
  email: string
  nip: string
  jabatan: string
  golongan: string
  satkerInduk: string
  /** Opsional; nomor telepon profil. */
  noTelepon: string | null
  fotoProfil?: string | null
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
  | 'dasbor'

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
  thread: 'Diskusi forum',
  balasan: 'Balasan forum',
  laporan: 'Laporan konten',
  ubah_profil: 'Ubah profil',
  ubah_preferensi: 'Ubah preferensi',
  kelola_pengguna: 'Kelola pengguna',
  akses_ditolak: 'Akses ditolak',
  moderasi: 'Moderasi forum',
  dokumen: 'Kelola dokumen',
  aplikasi: 'Data aplikasi',
  flowchart: 'Diagram Alur',
  validasi: 'Validasi data',
  backup: 'Cadangan Data',
  periode: 'Periode pembaruan',
  dasbor: 'Data dasbor',
}

/** Nomor seluler Indonesia: 08xx atau +628xx, 10–13 digit tanpa kode negara awalan nol. */
export const POLA_TELEPON = /^(\+62|0)8\d{8,11}$/

/** Hilangkan spasi, tanda hubung, dan titik agar "0812 3456-7890" dianggap sama dengan "081234567890". */
export function normalisasiTelepon(nilai: string) {
  return nilai.replace(/[\s\-.]/g, '')
}
