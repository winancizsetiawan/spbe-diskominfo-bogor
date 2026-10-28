export type JenisDokumen = 'regulasi' | 'pedoman' | 'laporan' | 'presentasi' | 'template' | 'sop' | 'panduan' | 'lainnya'

export type TipeBerkas = 'pdf' | 'docx' | 'xlsx' | 'pptx'

/** Pengguna biasa hanya melihat berlaku dan review; draft dan arsip dikelola Super Admin. */
export type StatusDokumen = 'draft' | 'review' | 'berlaku' | 'arsip'

export type Visibilitas = 'publik' | 'internal'

/** Halaman Dokumen memuat semua jenis selain SOP; halaman SOP hanya jenis SOP. */
export type Kelompok = 'dokumen' | 'sop'

export interface KategoriDokumen {
  id: number
  nama: string
}

export interface Dokumen {
  id: number
  jenis: JenisDokumen
  judul: string
  deskripsi: string
  tipeBerkas: TipeBerkas
  ukuranMb: number
  versi: string
  sumber: string | null
  status: StatusDokumen
  visibilitas: Visibilitas
  jumlahUnduhan: number
  kategori: KategoriDokumen | null
  tanggalRilis: string
}

export interface RingkasanDokumen {
  total: number
  berlaku: number
  review: number
  totalUnduhan: number
}

export type Urutan = 'terbaru' | 'populer'

export interface DokumenFilter {
  kelompok: Kelompok
  page: number
  q?: string
  jenis?: JenisDokumen
  kategori?: number
  urut: Urutan
}

export interface HasilUnduh {
  /** URL berumur pendek ke Object Storage; server menyajikannya sebagai lampiran. */
  url: string
  namaBerkas: string
}

export const JENIS_LABEL: Record<JenisDokumen, string> = {
  regulasi: 'Peraturan',
  pedoman: 'Pedoman',
  laporan: 'Laporan',
  presentasi: 'Presentasi',
  template: 'Template',
  sop: 'SOP',
  panduan: 'Panduan',
  lainnya: 'Lainnya',
}

/** Jenis yang bisa disaring di halaman Dokumen (SOP punya halaman sendiri). */
export const JENIS_DOKUMEN: JenisDokumen[] = ['regulasi', 'pedoman', 'laporan', 'presentasi', 'template', 'panduan', 'lainnya']

export const STATUS_LABEL: Record<StatusDokumen, string> = {
  draft: 'Draft',
  review: 'Dalam review',
  berlaku: 'Berlaku',
  arsip: 'Arsip',
}

export const KELOMPOK_INFO: Record<Kelompok, { judul: string; deskripsi: string }> = {
  dokumen: {
    judul: 'Dokumen',
    deskripsi: 'Regulasi, pedoman, laporan, dan template seputar SPBE.',
  },
  sop: {
    judul: 'SOP Pemerintahan',
    deskripsi: 'Standar Operasional Prosedur dalam penyelenggaraan SPBE.',
  },
}
