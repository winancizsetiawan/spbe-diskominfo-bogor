import type { JenisData, StatusPengajuan } from '@/features/validasi/types'

export interface PengajuanRow {
  id: number
  jenisData: JenisData
  status: StatusPengajuan
  /** Terisi untuk aplikasi dan RAA; kosong untuk flowchart. */
  idAplikasi: number | null
  /** Terisi hanya untuk jenis `proses` (flowchart). */
  idProses?: number | null
  pengaju: string
  tanggalPengajuan: string
  tanggalPutusan: string | null
  catatan: string | null
}

const hariLalu = (hari: number) => new Date(Date.now() - hari * 86_400_000).toISOString()

// Konsisten dengan status awal aplikasi di dbKatalog.ts: aplikasi berstatus Menunggu
// (3, 11) punya pengajuan Menunggu; sisanya riwayat keputusan.
export const pengajuan: PengajuanRow[] = [
  { id: 1, jenisData: 'aplikasi', status: 'menunggu', idAplikasi: 3, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(2), tanggalPutusan: null, catatan: null },
  { id: 2, jenisData: 'raa', status: 'menunggu', idAplikasi: 11, pengaju: 'Operator Diskominfo', tanggalPengajuan: hariLalu(5), tanggalPutusan: null, catatan: null },
  { id: 3, jenisData: 'aplikasi', status: 'disetujui', idAplikasi: 1, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(22), tanggalPutusan: hariLalu(20), catatan: null },
  { id: 4, jenisData: 'raa', status: 'disetujui', idAplikasi: 8, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(32), tanggalPutusan: hariLalu(30), catatan: 'Klasifikasi sudah sesuai pedoman.' },
  { id: 5, jenisData: 'raa', status: 'disetujui', idAplikasi: 10, pengaju: 'Operator Diskominfo', tanggalPengajuan: hariLalu(17), tanggalPutusan: hariLalu(15), catatan: null },
  { id: 6, jenisData: 'aplikasi', status: 'disetujui', idAplikasi: 13, pengaju: 'Operator Bapenda', tanggalPengajuan: hariLalu(27), tanggalPutusan: hariLalu(25), catatan: null },
  { id: 7, jenisData: 'raa', status: 'perlu_revisi', idAplikasi: 2, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(8), tanggalPutusan: hariLalu(6), catatan: 'Lengkapi RAA Level 3 sesuai pedoman.' },
  { id: 8, jenisData: 'aplikasi', status: 'ditolak', idAplikasi: 7, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(11), tanggalPutusan: hariLalu(9), catatan: 'Duplikat dengan layanan perizinan di DPMPTSP.' },
  // Flowchart (jenis proses): konsisten dengan status awal di dbFlowchart.ts.
  { id: 9, jenisData: 'proses', status: 'menunggu', idAplikasi: null, idProses: 2, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(2), tanggalPutusan: null, catatan: null },
  { id: 10, jenisData: 'proses', status: 'menunggu', idAplikasi: null, idProses: 8, pengaju: 'Operator Diskominfo', tanggalPengajuan: hariLalu(5), tanggalPutusan: null, catatan: null },
  { id: 11, jenisData: 'proses', status: 'disetujui', idAplikasi: null, idProses: 1, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(20), tanggalPutusan: hariLalu(18), catatan: null },
  { id: 12, jenisData: 'proses', status: 'perlu_revisi', idAplikasi: null, idProses: 5, pengaju: 'Ajri Dalae', tanggalPengajuan: hariLalu(9), tanggalPutusan: hariLalu(6), catatan: 'Tambahkan jalur persetujuan Sekretaris sebelum pengajuan ke Bappeda.' },
]

let seq = pengajuan.length
export const nextPengajuanId = () => ++seq
