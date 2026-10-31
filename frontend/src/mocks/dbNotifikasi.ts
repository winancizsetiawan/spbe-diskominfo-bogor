import type { Role } from '@/auth/types'
import type { Notifikasi } from '@/features/notifikasi/types'
import { USERS } from './db'

export interface NotifikasiRow extends Notifikasi {
  idUser: number
}

const jamLalu = (jam: number) => new Date(Date.now() - jam * 3_600_000).toISOString()

// id pengguna demo: 1 ASN, 2 Akademisi, 3 Admin OPD, 4 Super Admin (lihat db.ts).
export const notifikasi: NotifikasiRow[] = [
  { id: 1, idUser: 1, kategori: 'dokumen', judul: 'SOP baru telah diterbitkan', pesan: 'SOP Manajemen Aplikasi Pemerintahan versi 2.4', urlTujuan: '/dokumen/9', sudahDibaca: false, dibuatPada: jamLalu(2) },
  { id: 2, idUser: 1, kategori: 'forum', judul: 'Komentar baru di forum', pesan: 'Strategi implementasi SPBE di tingkat kecamatan', urlTujuan: '/forum/1', sudahDibaca: false, dibuatPada: jamLalu(5) },
  { id: 3, idUser: 1, kategori: 'pembelajaran', judul: 'Modul baru tersedia', pesan: 'Pengantar Arsitektur SPBE', urlTujuan: '/pembelajaran', sudahDibaca: true, dibuatPada: jamLalu(26) },
  { id: 4, idUser: 1, kategori: 'forum', judul: 'Balasan untuk thread Anda', pesan: 'Tantangan literasi digital ASN di kelurahan', urlTujuan: '/forum/5', sudahDibaca: true, dibuatPada: jamLalu(30) },
  { id: 5, idUser: 1, kategori: 'dokumen', judul: 'Dokumen baru ditambahkan', pesan: 'Laporan Evaluasi Indeks SPBE Nasional Tahun 2023', urlTujuan: '/dokumen/4', sudahDibaca: true, dibuatPada: jamLalu(50) },
  { id: 6, idUser: 2, kategori: 'forum', judul: 'Balasan untuk thread Anda', pesan: 'Rekomendasi tools open source untuk arsitektur domain', urlTujuan: '/forum/3', sudahDibaca: false, dibuatPada: jamLalu(3) },
  { id: 7, idUser: 2, kategori: 'dokumen', judul: 'Dokumen baru ditambahkan', pesan: 'Paparan Peta Rencana SPBE Kota Bogor 2025–2030', urlTujuan: '/dokumen/5', sudahDibaca: true, dibuatPada: jamLalu(40) },
  { id: 8, idUser: 3, kategori: 'dokumen', judul: 'Pedoman RAA versi baru terbit', pesan: 'Pedoman Penyusunan Arsitektur SPBE Pemerintah Daerah v2.1', urlTujuan: '/dokumen/2', sudahDibaca: false, dibuatPada: jamLalu(4) },
  { id: 9, idUser: 3, kategori: 'sistem', judul: 'Batas waktu pembaruan data', pesan: 'Segera lengkapi data aplikasi instansi Anda sebelum tenggat.', urlTujuan: '/katalog/aplikasi', sudahDibaca: false, dibuatPada: jamLalu(24) },
  { id: 10, idUser: 3, kategori: 'forum', judul: 'Komentar baru di forum', pesan: 'Pengalaman integrasi data antar-OPD lewat SPLP', urlTujuan: '/forum/2', sudahDibaca: true, dibuatPada: jamLalu(28) },
  { id: 11, idUser: 4, kategori: 'forum', judul: 'Laporan konten forum baru', pesan: '3 laporan menunggu tinjauan moderator.', urlTujuan: '/admin/moderasi', sudahDibaca: false, dibuatPada: jamLalu(2) },
  { id: 12, idUser: 4, kategori: 'sistem', judul: 'Pengajuan validasi baru', pesan: 'e-Office dan SIMRS Rujukan menunggu keputusan.', urlTujuan: '/admin/validasi', sudahDibaca: false, dibuatPada: jamLalu(6) },
  { id: 13, idUser: 4, kategori: 'dokumen', judul: 'Dokumen baru diunggah', pesan: 'Draf Pedoman Klasifikasi RAA', urlTujuan: '/admin/repositori', sudahDibaca: true, dibuatPada: jamLalu(48) },
]

let seq = notifikasi.length

/** Pengguna demo berdasarkan nama tampil; pengguna fiktif lain di data contoh tidak punya notifikasi. */
export const idUserDariNama = (nama: string): number | undefined =>
  Object.values(USERS).find((u) => u.nama === nama)?.id

export const idUserPerRole = (...roles: Role[]): number[] =>
  Object.values(USERS)
    .filter((u) => roles.includes(u.role))
    .map((u) => u.id)

/**
 * Pemicu notifikasi dari modul lain (Revisi 5.10). Penerima tidak dikenal diabaikan,
 * dan pelaku tidak diberi tahu tentang tindakannya sendiri.
 */
export function kirimNotifikasi(
  penerima: (number | undefined)[],
  isi: Pick<Notifikasi, 'kategori' | 'judul' | 'pesan' | 'urlTujuan'>,
  kecuali?: number,
) {
  const unik = new Set(penerima.filter((id): id is number => id !== undefined && id !== kecuali))
  for (const idUser of unik) {
    notifikasi.push({ ...isi, id: ++seq, idUser, sudahDibaca: false, dibuatPada: new Date().toISOString() })
  }
}
