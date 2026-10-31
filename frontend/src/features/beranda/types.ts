import type { Dokumen } from '@/features/dokumen/types'
import type { KategoriProses } from '@/features/flowchart/types'
import type { ThreadRingkas } from '@/features/forum/types'
import type { Aplikasi, StatusValidasi } from '@/features/katalog/types'
import type { Notifikasi } from '@/features/notifikasi/types'

/** Beranda ASN dan Akademisi: konten dan aktivitas komunitas. */
export interface BerandaInternal {
  tipe: 'internal'
  dokumenTerbaru: Dokumen[]
  notifikasi: Notifikasi[]
  belumDibaca: number
  threadPopuler: ThreadRingkas[]
}

export interface PembaruanMingguan {
  /** Tanggal awal minggu, ISO. */
  minggu: string
  aplikasiDiperbarui: number
  flowchartDiperbarui: number
}

export interface ProgresKategori {
  kategori: KategoriProses
  dipublikasikan: number
  total: number
}

export interface BerandaAdminOpd {
  tipe: 'admin_opd'
  instansi: { id: number; nama: string }
  ringkasan: {
    totalAplikasi: number
    sudahDiklasifikasi: number
    flowchartDipublikasikan: number
    totalFlowchart: number
    /** Persentase aplikasi berstatus RAA Sesuai. */
    kepatuhanRaa: number
  }
  statusRaa: { sesuai: number; perluPenyesuaian: number; belum: number }
  tren: PembaruanMingguan[]
  aplikasiTerbaru: Aplikasi[]
  progresFlowchart: ProgresKategori[]
  notifikasi: Notifikasi[]
  belumDibaca: number
}

export interface AktivitasHarian {
  /** Tanggal, format YYYY-MM-DD. */
  tanggal: string
  login: number
  validasi: number
  unggahan: number
  forum: number
}

export interface BerandaSuperAdmin {
  tipe: 'super_admin'
  ringkasan: {
    totalPengguna: number
    instansiTerdaftar: number
    totalDokumen: number
    menungguValidasi: number
    threadForum: number
    laporanBaru: number
  }
  statusValidasi: Record<Exclude<StatusValidasi, 'draft'>, number>
  aktivitas: AktivitasHarian[]
  notifikasi: Notifikasi[]
  belumDibaca: number
}

export type Beranda = BerandaInternal | BerandaAdminOpd | BerandaSuperAdmin

/** Ringkasan di landing untuk pengunjung tanpa login. */
export interface BerandaPublik {
  dokumenPublik: number
  sopBerlaku: number
  instansi: number
  diskusi: number
  dokumenPopuler: Dokumen[]
}
