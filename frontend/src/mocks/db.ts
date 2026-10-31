import type { User } from '@/auth/types'
import { namaInstansi } from './dbKatalog'
import type { KategoriForum, Penulis, StatusThread } from '@/features/forum/types'

// Data contoh untuk mode mock. Nama dan instansi fiktif.

export const USERS: Record<string, User> = {
  asn: {
    id: 1,
    nama: 'Andi Pratama',
    email: 'andi.pratama@example.go.id',
    role: 'asn',
    statusAkun: 'aktif',
    instansi: { id: 1, nama: namaInstansi(1, 'Diskominfo Kota Bogor') },
  },
  akademisi: {
    id: 2,
    nama: 'Siti Rahma',
    email: 'siti.rahma@example.ac.id',
    role: 'akademisi',
    statusAkun: 'aktif',
    instansi: { id: 10, nama: 'Perguruan Tinggi Mitra' },
  },
  admin_opd: {
    id: 3,
    nama: 'Ajri Dalae',
    email: 'ajri.dalae@example.go.id',
    role: 'admin_opd',
    statusAkun: 'aktif',
    instansi: { id: 2, nama: namaInstansi(2, 'Dinas Kesehatan Kota Bogor') },
  },
  super_admin: {
    id: 4,
    nama: 'Derto',
    email: 'derto@example.go.id',
    role: 'super_admin',
    statusAkun: 'aktif',
    instansi: { id: 1, nama: namaInstansi(1, 'Diskominfo Kota Bogor') },
  },
}

export const penulisDari = (user: User): Penulis => ({ nama: user.nama, instansi: user.instansi.nama })

export const KATEGORI: KategoriForum[] = [
  { id: 1, nama: 'Diskusi Umum' },
  { id: 2, nama: 'Implementasi' },
  { id: 3, nama: 'Teknis' },
  { id: 4, nama: 'Regulasi' },
]

export interface ThreadRow {
  id: number
  idKategori: number
  judul: string
  konten: string
  penulis: Penulis
  dibuatPada: string
  dilihat: number
  status: StatusThread
}

export interface BalasanRow {
  id: number
  threadId: number
  konten: string
  penulis: Penulis
  dibuatPada: string
  penilai: Set<number>
  /** Disembunyikan moderator; tidak tampil di forum. */
  tersembunyi?: boolean
}

export interface LaporanRow {
  id: number
  targetTipe: 'thread' | 'balasan'
  targetId: number
  pelapor: string
  alasan: string
  dibuatPada: string
  status: 'baru' | 'ditindak' | 'ditolak'
}

const jamLalu = (jam: number) => new Date(Date.now() - jam * 3_600_000).toISOString()
const P = {
  budi: { nama: 'Budi Santoso', instansi: 'Bappeda Kota Bogor' },
  siti: penulisDari(USERS.akademisi),
  andi: penulisDari(USERS.asn),
  dewi: { nama: 'Dewi Lestari', instansi: 'Kecamatan Bogor Tengah' },
  rina: { nama: 'Rina Oktaviani', instansi: 'Dinas Kesehatan Kota Bogor' },
}

export const threads: ThreadRow[] = [
  { id: 1, idKategori: 2, judul: 'Strategi implementasi SPBE di tingkat kecamatan', konten: 'Kecamatan kami baru mulai mendata aplikasi layanan. Bagaimana pengalaman OPD lain menyusun prioritas aplikasi yang perlu diintegrasikan lebih dulu?', penulis: P.dewi, dibuatPada: jamLalu(2), dilihat: 345, status: 'aktif' },
  { id: 2, idKategori: 3, judul: 'Pengalaman integrasi data antar-OPD lewat SPLP', konten: 'Kami sedang menyiapkan API untuk data kesehatan. Apa saja hal teknis yang perlu disiapkan sebelum mendaftar ke SPLP Kota Bogor?', penulis: P.rina, dibuatPada: jamLalu(26), dilihat: 120, status: 'aktif' },
  { id: 3, idKategori: 3, judul: 'Rekomendasi tools open source untuk arsitektur domain', konten: 'Sesuai arahan Peta Rencana SPBE ke open source, tools apa yang teman-teman pakai untuk memodelkan proses bisnis (BPMN)?', penulis: P.siti, dibuatPada: jamLalu(30), dilihat: 310, status: 'aktif' },
  { id: 4, idKategori: 4, judul: 'Tafsir Permen PANRB 59/2020 untuk klasifikasi RAA', konten: 'Apakah aplikasi internal kepegawaian masuk domain Manajemen atau Pendukung? Mohon pencerahan rekan-rekan yang sudah mengklasifikasi.', penulis: P.budi, dibuatPada: jamLalu(50), dilihat: 198, status: 'terkunci' },
  { id: 5, idKategori: 1, judul: 'Tantangan literasi digital ASN di kelurahan', konten: 'Banyak rekan di kelurahan yang belum terbiasa memakai aplikasi. Ada ide program pendampingan yang efektif?', penulis: P.andi, dibuatPada: jamLalu(72), dilihat: 87, status: 'aktif' },
  { id: 6, idKategori: 2, judul: 'Checklist sebelum asesmen standardisasi aplikasi', konten: 'Dokumen apa saja yang biasanya diminta Tim Asesmen Diskominfo sebelum aplikasi mendapat subdomain kotabogor.go.id?', penulis: P.budi, dibuatPada: jamLalu(96), dilihat: 264, status: 'aktif' },
  { id: 7, idKategori: 3, judul: 'Konfigurasi backup harian untuk aplikasi OPD', konten: 'Buku panduan meminta backup harian dan menyimpan 7 hari terakhir. Bagaimana praktik yang sudah berjalan, termasuk untuk berkas unggahan?', penulis: P.rina, dibuatPada: jamLalu(120), dilihat: 143, status: 'aktif' },
]

export const balasan: BalasanRow[] = [
  { id: 1, threadId: 1, konten: 'Kami mulai dari aplikasi yang paling banyak dipakai warga, lalu yang datanya dibutuhkan OPD lain.', penulis: P.budi, dibuatPada: jamLalu(1), penilai: new Set([2, 4]) },
  { id: 2, threadId: 1, konten: 'Setuju. Cek juga status integrasi SPLP-nya, karena yang sudah terhubung lebih cepat dipetakan.', penulis: P.rina, dibuatPada: jamLalu(0.5), penilai: new Set() },
  { id: 3, threadId: 3, konten: 'Kami memakai bpmn.io untuk menggambar; berkasnya bisa disimpan sebagai BPMN 2.0 XML.', penulis: P.andi, dibuatPada: jamLalu(28), penilai: new Set([2]) },
  { id: 4, threadId: 4, konten: 'Aplikasi kepegawaian umumnya masuk domain Manajemen (SDM aparatur).', penulis: P.siti, dibuatPada: jamLalu(49), penilai: new Set([1, 3]) },
]

export const laporan: LaporanRow[] = [
  { id: 1, targetTipe: 'thread', targetId: 2, pelapor: 'Budi Santoso', alasan: 'Berisi nomor telepon pribadi pegawai di kolom isi.', dibuatPada: jamLalu(3), status: 'baru' },
  { id: 2, targetTipe: 'balasan', targetId: 2, pelapor: 'Siti Rahma', alasan: 'Bernada menyerang pihak lain dan tidak membantu diskusi.', dibuatPada: jamLalu(5), status: 'baru' },
  { id: 3, targetTipe: 'balasan', targetId: 2, pelapor: 'Andi Pratama', alasan: 'Setuju dengan laporan sebelumnya, bahasanya kurang pantas.', dibuatPada: jamLalu(2), status: 'baru' },
  { id: 4, targetTipe: 'thread', targetId: 5, pelapor: 'Rina Oktaviani', alasan: 'Di luar topik forum SPBE.', dibuatPada: jamLalu(40), status: 'ditolak' },
  { id: 5, targetTipe: 'thread', targetId: 4, pelapor: 'Ahmad Fauzi', alasan: 'Menyebut merek vendor tertentu sebagai rekomendasi.', dibuatPada: jamLalu(60), status: 'ditindak' },
]

let seqThread = threads.length
let seqBalasan = balasan.length
let seqLaporan = laporan.length
export const nextThreadId = () => ++seqThread
export const nextBalasanId = () => ++seqBalasan
export const nextLaporanId = () => ++seqLaporan
