import type { KategoriProses, JenisProses, RiwayatVersi } from '@/features/flowchart/types'
import type { StatusValidasi } from '@/features/katalog/types'
import { buatBpmn } from './bpmnContoh'

export interface FlowchartRow {
  id: number
  kode: string
  nama: string
  deskripsi: string
  kategori: KategoriProses
  jenis: JenisProses
  versi: string
  pic: string
  idInstansi: number
  status: StatusValidasi
  catatanValidasi: string | null
  diperbaruiPada: string
  idAplikasi: number[]
  idSop: number[]
  bpmnXml: string
  riwayat: RiwayatVersi[]
}

const hariLalu = (hari: number) => new Date(Date.now() - hari * 86_400_000).toISOString()
const riwayat = (...r: [string, string, string, number][]): RiwayatVersi[] =>
  r.map(([versi, catatan, oleh, hari]) => ({ versi, catatan, oleh, tanggal: hariLalu(hari) }))

// id instansi dan aplikasi mengacu pada dbKatalog.ts; id SOP pada dbDokumen.ts.
export const flowchart: FlowchartRow[] = [
  { id: 1, kode: 'FB-01-RJL', nama: 'Proses Pelayanan Pasien Rawat Jalan', deskripsi: 'Alur pasien dari pendaftaran antrean hingga pembayaran dan obat di puskesmas.', kategori: 'utama', jenis: 'as_is', versi: '2.1', pic: 'Bidang Pelayanan Kesehatan', idInstansi: 2, status: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(18), idAplikasi: [1, 8], idSop: [9], bpmnXml: buatBpmn('p1', ['Pasien mendaftar antrean', 'Petugas verifikasi data', '?Data lengkap?', 'Dokter memeriksa pasien', 'Apotek menyerahkan obat']), riwayat: riwayat(['2.1', 'Penyesuaian alur antrean online', 'Ajri Dalae', 18], ['2.0', 'Penambahan verifikasi data', 'Ajri Dalae', 90], ['1.0', 'Versi awal', 'Rina Oktaviani', 200]) },
  { id: 2, kode: 'FB-02-RUJ', nama: 'Proses Pengelolaan Rujukan Pasien', deskripsi: 'Alur rujukan pasien dari puskesmas ke rumah sakit rujukan beserta pelacakan statusnya.', kategori: 'utama', jenis: 'to_be', versi: '1.0', pic: 'Bidang Pelayanan Kesehatan', idInstansi: 2, status: 'menunggu', catatanValidasi: null, diperbaruiPada: hariLalu(2), idAplikasi: [3], idSop: [10], bpmnXml: buatBpmn('p2', ['Dokter menerbitkan rujukan', 'Sistem mengirim ke RS tujuan', 'RS menerima atau menolak', 'Pasien diberi jadwal']), riwayat: riwayat(['1.0', 'Versi awal', 'Ajri Dalae', 2]) },
  { id: 3, kode: 'FB-03-KLB', nama: 'Proses Pelaporan Kejadian Luar Biasa', deskripsi: 'Pelaporan dan penanganan awal kejadian luar biasa penyakit dari puskesmas ke dinas.', kategori: 'pendukung', jenis: 'as_is', versi: '1.2', pic: 'Bidang Pencegahan Penyakit', idInstansi: 2, status: 'draft', catatanValidasi: null, diperbaruiPada: hariLalu(3), idAplikasi: [9], idSop: [], bpmnXml: buatBpmn('p3', ['Puskesmas mencatat kasus', 'Dinas memverifikasi laporan', 'Tim lapangan menyelidiki']), riwayat: riwayat(['1.2', 'Penambahan verifikasi dinas', 'Ajri Dalae', 3], ['1.0', 'Versi awal', 'Ajri Dalae', 40]) },
  { id: 4, kode: 'FB-04-OBT', nama: 'Proses Pengadaan Obat dan Alat Kesehatan', deskripsi: 'Perencanaan kebutuhan hingga penerimaan obat dan alat kesehatan.', kategori: 'pendukung', jenis: 'as_is', versi: '1.0', pic: 'Sekretariat Dinas', idInstansi: 2, status: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(35), idAplikasi: [], idSop: [14], bpmnXml: buatBpmn('p4', ['Unit mengajukan kebutuhan', 'Sekretariat menyusun rencana', 'Pengadaan dan penerimaan barang']), riwayat: riwayat(['1.0', 'Versi awal', 'Rina Oktaviani', 35]) },
  { id: 5, kode: 'FB-05-ANG', nama: 'Proses Perencanaan dan Penganggaran Dinas', deskripsi: 'Penyusunan rencana kerja dan anggaran tahunan dinas.', kategori: 'manajemen', jenis: 'to_be', versi: '1.1', pic: 'Sekretariat Dinas', idInstansi: 2, status: 'perlu_revisi', catatanValidasi: 'Tambahkan jalur persetujuan Sekretaris sebelum pengajuan ke Bappeda.', diperbaruiPada: hariLalu(6), idAplikasi: [], idSop: [], bpmnXml: buatBpmn('p5', ['Unit menyusun usulan', 'Sekretariat menggabungkan usulan', 'Pengajuan ke Bappeda']), riwayat: riwayat(['1.1', 'Penyesuaian setelah musrenbang', 'Ajri Dalae', 7], ['1.0', 'Versi awal', 'Ajri Dalae', 60]) },
  { id: 6, kode: 'FB-06-IMN', nama: 'Proses Pengelolaan Imunisasi', deskripsi: 'Penjadwalan, pelaksanaan, dan pencatatan imunisasi di fasilitas kesehatan.', kategori: 'utama', jenis: 'as_is', versi: '1.0', pic: 'Bidang Pencegahan Penyakit', idInstansi: 2, status: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(22), idAplikasi: [6], idSop: [], bpmnXml: buatBpmn('p6', ['Petugas menjadwalkan imunisasi', 'Peserta hadir dan diperiksa', '?Layak imunisasi?', 'Petugas mencatat imunisasi']), riwayat: riwayat(['1.0', 'Versi awal', 'Rina Oktaviani', 22]) },
  { id: 7, kode: 'FB-07-GTI', nama: 'Proses Penanganan Gangguan TI', deskripsi: 'Pelaporan, eskalasi, dan pemulihan gangguan layanan TI di lingkungan OPD.', kategori: 'pendukung', jenis: 'to_be', versi: '1.0', pic: 'Bidang APTIKA', idInstansi: 1, status: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(14), idAplikasi: [10], idSop: [13], bpmnXml: buatBpmn('p7', ['Pengguna melapor gangguan', 'Helpdesk memprioritaskan tiket', '?Gangguan teratasi?', 'Tiket ditutup']), riwayat: riwayat(['1.0', 'Versi awal', 'Operator Diskominfo', 14]) },
  { id: 8, kode: 'FB-08-SRT', nama: 'Proses Persuratan Elektronik', deskripsi: 'Pembuatan, penomoran, persetujuan, dan pengiriman naskah dinas elektronik.', kategori: 'pendukung', jenis: 'as_is', versi: '1.0', pic: 'Sekretariat Diskominfo', idInstansi: 1, status: 'menunggu', catatanValidasi: null, diperbaruiPada: hariLalu(5), idAplikasi: [11], idSop: [], bpmnXml: buatBpmn('p8', ['Pembuat menyusun naskah', 'Atasan menyetujui', 'Sistem memberi nomor surat', 'Naskah dikirim']), riwayat: riwayat(['1.0', 'Versi awal', 'Operator Diskominfo', 5]) },
  { id: 9, kode: 'FB-09-PBB', nama: 'Proses Penetapan dan Pembayaran PBB', deskripsi: 'Penetapan pajak bumi dan bangunan hingga pembayaran dan pelaporan.', kategori: 'utama', jenis: 'as_is', versi: '1.3', pic: 'Bidang Pendapatan', idInstansi: 3, status: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(28), idAplikasi: [13], idSop: [], bpmnXml: buatBpmn('p9', ['Petugas menetapkan PBB', 'Wajib pajak menerima SPPT', 'Wajib pajak membayar', 'Sistem merekonsiliasi pembayaran']), riwayat: riwayat(['1.3', 'Integrasi pembayaran daring', 'Operator Bapenda', 28], ['1.0', 'Versi awal', 'Operator Bapenda', 250]) },
]

let seq = flowchart.length
let seqKode = flowchart.length
export const nextFlowchartId = () => ++seq

const ABAIKAN = new Set(['proses', 'dan', 'dari', 'untuk', 'di', 'ke', 'yang', 'dinas'])

/** Kode berpola FB-nn-XXX; XXX dari inisial kata penting pada nama. */
export function buatKode(nama: string): string {
  const kata = nama.split(/\s+/).filter((k) => k && !ABAIKAN.has(k.toLowerCase()))
  const huruf = (kata.map((k) => k[0]).join('') + (kata[0] ?? '')).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  return `FB-${String(++seqKode).padStart(2, '0')}-${huruf}`
}

/** Naikkan angka terakhir pada versi: 1.0 → 1.1, 2 → 3. */
export function naikkanVersi(versi: string): string {
  const bagian = versi.split('.')
  bagian[bagian.length - 1] = String(Number(bagian[bagian.length - 1]) + 1)
  return bagian.join('.')
}
