import type { Instansi, KodeRaa, NodeRaa, StatusValidasi } from '@/features/katalog/types'
import { pengajuan } from './dbValidasi'

// Data contoh mode mock. Pohon RAA di bawah hanya ilustrasi; ganti dengan
// referensi resmi dari arsitektur.spbe.go.id saat backend tersedia.

const instansiDemo: Instansi[] = [
  { id: 1, nama: 'Diskominfo Kota Bogor' },
  { id: 2, nama: 'Dinas Kesehatan Kota Bogor' },
  { id: 3, nama: 'Bapenda Kota Bogor' },
]

const raaDemo: NodeRaa[] = [
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

const aplikasiDemo: AplikasiRow[] = [
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

// Data nyata (lokal, tidak masuk git): dibuat oleh scripts/ekstrak-excel.py dari matriks Excel.
// Bila berkasnya tidak ada, mock memakai data contoh di atas.
interface DataNyata {
  instansi: { nama: string; akronim: string; probis: number; layanan: number; data: number }[]
  aplikasi: { kode: string; nama: string; instansi: string; deskripsi: string; raa1: string; raa2: string }[]
  proses: { kode: string; nama: string; deskripsi: string; instansi: string; jenis: string }[]
}
const nyata = Object.values(import.meta.glob<DataNyata>('./dataNyata/spbe.json', { eager: true, import: 'default' }))[0] as DataNyata | undefined

/** Id instansi yang dipakai akun dan data demo lain (db.ts, dbPengguna.ts) dipertahankan. */
const ID_TETAP: Record<string, number> = {
  'Dinas Komunikasi dan Informatika': 1,
  'Dinas Kesehatan': 2,
  'Badan Pendapatan Daerah': 3,
  'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah': 4,
  'Kecamatan Bogor Tengah': 5,
  'Dinas Pendidikan': 6,
}

const kapital = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
/** "RAA.01.01 APLIKASI LAYANAN PUBLIK" -> { kode, nama }. */
const pecahRaa = (s: string) => {
  const [kode, ...nama] = s.split(' ')
  return { kode, nama: kapital(nama.join(' ')) }
}

function bangunNyata(d: DataNyata) {
  let berikut = 20
  const instansi: Instansi[] = d.instansi.map((i) => ({ id: ID_TETAP[i.nama] ?? berikut++, nama: i.nama }))
  const idDari = new Map(instansi.map((i) => [i.nama, i.id]))

  const pohon = new Map<string, NodeRaa>()
  for (const a of d.aplikasi) {
    if (!a.raa1) continue
    const l1 = pecahRaa(a.raa1)
    const induk = pohon.get(l1.kode) ?? { ...l1, anak: [] }
    pohon.set(l1.kode, induk)
    if (a.raa2) {
      const l2 = pecahRaa(a.raa2)
      if (!induk.anak!.some((n) => n.kode === l2.kode)) induk.anak!.push(l2)
    }
  }
  const raa = [...pohon.values()].sort((x, y) => x.kode.localeCompare(y.kode))
  raa.forEach((n) => n.anak!.sort((x, y) => x.kode.localeCompare(y.kode)))

  const rows: AplikasiRow[] = d.aplikasi.map((a, i) => {
    const l1 = a.raa1 ? pecahRaa(a.raa1) : null
    const l2 = a.raa2 ? pecahRaa(a.raa2) : null
    return {
      id: i + 1,
      idInstansi: idDari.get(a.instansi)!,
      nama: a.nama,
      deskripsi: a.deskripsi,
      kategori: l2?.nama ?? null,
      raa: { level1: l1?.kode ?? null, level2: l2?.kode ?? null, level3: null },
      statusValidasi: 'disetujui',
      catatanValidasi: null,
      diperbaruiPada: hariLalu((i * 7) % 90 + 1),
    }
  })
  // Status awal mengikuti antrean validasi di dbValidasi.ts; beberapa aplikasi dibiarkan draft untuk didemokan.
  for (const p of pengajuan) {
    const row = rows.find((r) => r.id === p.idAplikasi)
    if (!row) continue
    row.statusValidasi = p.status
    row.catatanValidasi = p.catatan && (p.status === 'perlu_revisi' || p.status === 'ditolak') ? p.catatan : null
  }
  for (const id of [14, 15, 16]) rows.find((r) => r.id === id && r.statusValidasi === 'disetujui')!.statusValidasi = 'draft'
  const proses = d.proses.map((p) => ({ ...p, idInstansi: idDari.get(p.instansi)! }))
  const cakupan = new Map(d.instansi.map((i) => [idDari.get(i.nama)!, { layanan: i.layanan, data: i.data }]))
  return { instansi, raa, rows, proses, cakupan }
}

const hasilNyata = nyata ? bangunNyata(nyata) : null
export const adaDataNyata = hasilNyata !== null
export const INSTANSI: Instansi[] = hasilNyata?.instansi ?? instansiDemo
export const REFERENSI_RAA: NodeRaa[] = hasilNyata?.raa ?? raaDemo
export const aplikasi: AplikasiRow[] = hasilNyata?.rows ?? aplikasiDemo
export const prosesNyata = hasilNyata?.proses ?? []
/** Jumlah layanan dan data per instansi dari UnitKerja; kosong bila memakai data contoh. */
export const cakupanNyata = hasilNyata?.cakupan ?? new Map<number, { layanan: number; data: number }>()
/** Nama instansi untuk akun demo; cadangan dipakai bila id tidak ada. */
export const namaInstansi = (id: number, cadangan: string) => INSTANSI.find((i) => i.id === id)?.nama ?? cadangan

let seq = aplikasi.length
export const nextAplikasiId = () => ++seq
