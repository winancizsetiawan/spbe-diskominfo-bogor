import type { Instansi, KodeRaa, NodeRaa, StatusValidasi } from '@/features/katalog/types'

// Data contoh mode mock. Pohon RAA di bawah hanya ilustrasi; ganti dengan
// referensi resmi dari arsitektur.spbe.go.id saat backend tersedia.

export const INSTANSI: Instansi[] = [
  { id: 1, nama: 'Diskominfo Kota Bogor' },
  { id: 2, nama: 'Dinas Kesehatan Kota Bogor' },
  { id: 3, nama: 'Bapenda Kota Bogor' },
]

export const REFERENSI_RAA: NodeRaa[] = [
  {
    kode: '1',
    nama: 'Layanan Publik',
    anak: [
      {
        kode: '1.1',
        nama: 'Kesehatan',
        anak: [
          { kode: '1.1.1', nama: 'Pelayanan Kesehatan Dasar' },
          { kode: '1.1.2', nama: 'Rujukan dan Rumah Sakit' },
          { kode: '1.1.3', nama: 'Surveilans dan Imunisasi' },
        ],
      },
      {
        kode: '1.2',
        nama: 'Perizinan dan Pengaduan',
        anak: [
          { kode: '1.2.1', nama: 'Perizinan Berusaha' },
          { kode: '1.2.2', nama: 'Pengaduan Masyarakat' },
        ],
      },
    ],
  },
  {
    kode: '2',
    nama: 'Administrasi Pemerintahan',
    anak: [
      {
        kode: '2.1',
        nama: 'Kepegawaian',
        anak: [
          { kode: '2.1.1', nama: 'Manajemen ASN' },
          { kode: '2.1.2', nama: 'Kinerja ASN' },
        ],
      },
      {
        kode: '2.2',
        nama: 'Keuangan dan Pendapatan',
        anak: [
          { kode: '2.2.1', nama: 'Pengelolaan Pajak Daerah' },
          { kode: '2.2.2', nama: 'Penganggaran' },
        ],
      },
      {
        kode: '2.3',
        nama: 'Persuratan dan Data',
        anak: [
          { kode: '2.3.1', nama: 'Tata Naskah Dinas' },
          { kode: '2.3.2', nama: 'Data dan Statistik' },
        ],
      },
    ],
  },
]

export interface AplikasiRow {
  id: number
  idInstansi: number
  nama: string
  deskripsi: string
  kategori: string | null
  raa: KodeRaa
  statusValidasi: StatusValidasi
  catatanValidasi: string | null
  diperbaruiPada: string
}

const hariLalu = (hari: number) => new Date(Date.now() - hari * 86_400_000).toISOString()
const raa = (level1: string | null, level2: string | null = null, level3: string | null = null): KodeRaa => ({
  level1,
  level2,
  level3,
})

export const aplikasi: AplikasiRow[] = [
  // Dinas Kesehatan (instansi Admin OPD demo)
  { id: 1, idInstansi: 2, nama: 'SIKDA', deskripsi: 'Sistem informasi kesehatan daerah untuk puskesmas.', kategori: 'Pelayanan Publik', raa: raa('1', '1.1', '1.1.1'), statusValidasi: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(20) },
  { id: 2, idInstansi: 2, nama: 'e-Puskesmas', deskripsi: 'Rekam medis elektronik puskesmas.', kategori: 'Pelayanan Publik', raa: raa('1', '1.1'), statusValidasi: 'perlu_revisi', catatanValidasi: 'Lengkapi RAA Level 3 sesuai pedoman.', diperbaruiPada: hariLalu(6) },
  { id: 3, idInstansi: 2, nama: 'SIMRS Rujukan', deskripsi: 'Pengelolaan rujukan pasien antar-fasilitas.', kategori: 'Pelayanan Publik', raa: raa('1', '1.1', '1.1.2'), statusValidasi: 'menunggu', catatanValidasi: null, diperbaruiPada: hariLalu(2) },
  { id: 4, idInstansi: 2, nama: 'Sehat Bogor Mobile', deskripsi: 'Aplikasi informasi layanan kesehatan untuk warga.', kategori: 'Pelayanan Publik', raa: raa(null), statusValidasi: 'draft', catatanValidasi: null, diperbaruiPada: hariLalu(1) },
  { id: 5, idInstansi: 2, nama: 'Dasbor Gizi Balita', deskripsi: '', kategori: 'Manajemen', raa: raa(null), statusValidasi: 'draft', catatanValidasi: null, diperbaruiPada: hariLalu(3) },
  { id: 6, idInstansi: 2, nama: 'e-Vaksin', deskripsi: 'Pencatatan imunisasi dan jadwal vaksinasi.', kategori: 'Pelayanan Publik', raa: raa('1', '1.1', '1.1.3'), statusValidasi: 'draft', catatanValidasi: null, diperbaruiPada: hariLalu(4) },
  { id: 7, idInstansi: 2, nama: 'SIP Nakes', deskripsi: 'Surat izin praktik tenaga kesehatan.', kategori: 'Pelayanan Publik', raa: raa('1', '1.2'), statusValidasi: 'ditolak', catatanValidasi: 'Duplikat dengan layanan perizinan di DPMPTSP.', diperbaruiPada: hariLalu(9) },
  { id: 8, idInstansi: 2, nama: 'Antrean Online Puskesmas', deskripsi: 'Pendaftaran antrean puskesmas secara daring.', kategori: 'Pelayanan Publik', raa: raa('1', '1.1', '1.1.1'), statusValidasi: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(30) },
  { id: 9, idInstansi: 2, nama: 'Laporan KLB', deskripsi: 'Pelaporan kejadian luar biasa penyakit.', kategori: null, raa: raa(null), statusValidasi: 'draft', catatanValidasi: null, diperbaruiPada: hariLalu(12) },
  // Diskominfo
  { id: 10, idInstansi: 1, nama: 'Portal Satu Data', deskripsi: 'Portal data sektoral Kota Bogor.', kategori: 'Manajemen', raa: raa('2', '2.3', '2.3.2'), statusValidasi: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(15) },
  { id: 11, idInstansi: 1, nama: 'e-Office', deskripsi: 'Persuratan dan tata naskah dinas elektronik.', kategori: 'Manajemen', raa: raa('2', '2.3'), statusValidasi: 'menunggu', catatanValidasi: null, diperbaruiPada: hariLalu(5) },
  { id: 12, idInstansi: 1, nama: 'Dasbor Kota Cerdas', deskripsi: 'Pemantauan indikator kota cerdas.', kategori: 'Manajemen', raa: raa('2'), statusValidasi: 'draft', catatanValidasi: null, diperbaruiPada: hariLalu(8) },
  // Bapenda
  { id: 13, idInstansi: 3, nama: 'e-PBB', deskripsi: 'Pembayaran dan informasi PBB.', kategori: 'Keuangan', raa: raa('2', '2.2', '2.2.1'), statusValidasi: 'disetujui', catatanValidasi: null, diperbaruiPada: hariLalu(25) },
  { id: 14, idInstansi: 3, nama: 'SIPD Pajak', deskripsi: '', kategori: 'Keuangan', raa: raa('2'), statusValidasi: 'draft', catatanValidasi: null, diperbaruiPada: hariLalu(7) },
]

let seq = aplikasi.length
export const nextAplikasiId = () => ++seq
