import type { JenisDokumen, StatusDokumen, TipeBerkas, Visibilitas } from '@/features/dokumen/types'

export interface MetadataDokumen {
  jenis: JenisDokumen
  /** Wajib untuk SOP, kosong untuk jenis lain. */
  idKategori: number | null
  judul: string
  deskripsi: string
  versi: string
  sumber: string | null
  visibilitas: Visibilitas
}

export interface MulaiUnggahInput {
  nama: string
  tipeBerkas: TipeBerkas
  ukuranBytes: number
  metadata: MetadataDokumen
}

/** Jawaban `unggah/mulai`: tujuan unggahan langsung ke Object Storage, berumur pendek. */
export interface SesiUnggah {
  idSesi: string
  urlUnggah: string
  /** Field kebijakan (policy) yang wajib ikut dikirim bersama berkas. */
  fields: Record<string, string>
}

export interface HitunganStatus {
  semua: number
  draft: number
  review: number
  berlaku: number
  arsip: number
}

export interface AdminDokumenFilter {
  page: number
  q?: string
  /** undefined = semua status. */
  status?: StatusDokumen
}

/** Batas dari PRD dan Buku Panduan: maks 10 MB per berkas, satu berkas, tipe diizinkan. */
export const BATAS_UNGGAH = { maksMb: 10, maksBytes: 10 * 1024 * 1024 } as const

export const TIPE_DIIZINKAN: TipeBerkas[] = ['pdf', 'docx', 'xlsx', 'pptx']

export const BATAS_METADATA = {
  judulMin: 5,
  judulMax: 150,
  deskripsiMax: 500,
  versiMax: 20,
  sumberMax: 100,
} as const

/** Versi seperti 1, 1.2, atau 2.4.1. */
export const POLA_VERSI = /^\d+(\.\d+){0,3}$/

export function tipeDariNama(nama: string): TipeBerkas | null {
  const ekstensi = nama.split('.').pop()?.toLowerCase()
  return TIPE_DIIZINKAN.find((t) => t === ekstensi) ?? null
}

/** Pemeriksaan di klien hanya kenyamanan; server memvalidasi ulang tipe, ukuran, dan isi berkas. */
export function validasiBerkas(file: File): string | null {
  if (file.size === 0) return 'Berkas kosong.'
  if (file.size > BATAS_UNGGAH.maksBytes) {
    return `Ukuran berkas ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas ${BATAS_UNGGAH.maksMb} MB.`
  }
  if (!tipeDariNama(file.name)) {
    return `Tipe berkas tidak diizinkan. Gunakan ${TIPE_DIIZINKAN.map((t) => t.toUpperCase()).join(', ')}.`
  }
  return null
}

/** Alur status dokumen: draft → review → berlaku → arsip (K6 untuk dokumen). */
export const TRANSISI_STATUS: Record<StatusDokumen, StatusDokumen[]> = {
  draft: ['review', 'berlaku'],
  review: ['draft', 'berlaku'],
  berlaku: ['review', 'arsip'],
  arsip: ['draft'],
}

export const AKSI_STATUS: Record<StatusDokumen, { label: string; keterangan: string }> = {
  draft: { label: 'Kembalikan ke Draft', keterangan: 'Tidak tampil bagi pengguna; hanya terlihat oleh Super Admin.' },
  review: { label: 'Masukkan ke siklus review', keterangan: 'Tampil bagi pengguna internal dengan penanda Dalam review.' },
  berlaku: { label: 'Terbitkan (Berlaku)', keterangan: 'Tampil sesuai visibilitasnya dan dapat diunduh.' },
  arsip: { label: 'Arsipkan', keterangan: 'Tidak tampil lagi bagi pengguna; dokumen tetap tersimpan.' },
}
