import { delay, http, HttpResponse } from 'msw'
import { JENIS_LABEL, STATUS_LABEL, type Dokumen, type JenisDokumen, type StatusDokumen, type TipeBerkas } from '@/features/dokumen/types'
import {
  BATAS_METADATA,
  BATAS_UNGGAH,
  POLA_VERSI,
  TIPE_DIIZINKAN,
  TRANSISI_STATUS,
  type HitunganStatus,
  type MetadataDokumen,
  type MulaiUnggahInput,
} from '@/features/repositori/types'
import { dokumen, KATEGORI_SOP } from '../dbDokumen'
import { catatAktivitas } from '../dbAktivitas'
import { idUserPerRole, kirimNotifikasi } from '../dbNotifikasi'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 6
const MASA_SESI_MS = 10 * 60 * 1000

const forbidden = () => HttpResponse.json({ message: 'Hanya Super Admin yang dapat mengelola repositori.' }, { status: 403 })

interface SesiRow {
  idUser: number
  nama: string
  tipeBerkas: TipeBerkas
  ukuranBytes: number
  metadata: MetadataDokumen
  kedaluwarsa: number
}

// Sesi unggahan sementara, seperti presigned URL berumur pendek di backend sungguhan.
const sesi = new Map<string, SesiRow>()

function validasiMetadata(m: Partial<MetadataDokumen> | undefined): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!m) return { judul: 'Metadata wajib diisi.' }
  if (!m.jenis || !(m.jenis in JENIS_LABEL)) errors.jenis = 'Jenis tidak valid.'
  if (m.jenis === 'sop') {
    if (!KATEGORI_SOP.some((k) => k.id === m.idKategori)) errors.kategori = 'Pilih kategori SOP.'
  } else if (m.idKategori != null) {
    errors.kategori = 'Kategori hanya untuk SOP.'
  }
  const judul = (m.judul ?? '').trim()
  if (judul.length < BATAS_METADATA.judulMin || judul.length > BATAS_METADATA.judulMax)
    errors.judul = `Judul harus ${BATAS_METADATA.judulMin}–${BATAS_METADATA.judulMax} karakter.`
  if ((m.deskripsi ?? '').length > BATAS_METADATA.deskripsiMax)
    errors.deskripsi = `Deskripsi maksimal ${BATAS_METADATA.deskripsiMax} karakter.`
  if (!POLA_VERSI.test((m.versi ?? '').trim())) errors.versi = 'Versi hanya angka dipisah titik, mis. 1.2.'
  if ((m.sumber ?? '').length > BATAS_METADATA.sumberMax) errors.sumber = `Sumber maksimal ${BATAS_METADATA.sumberMax} karakter.`
  if (m.visibilitas !== 'publik' && m.visibilitas !== 'internal') errors.visibilitas = 'Visibilitas tidak valid.'
  return errors
}

export const repositoriHandlers = [
  http.get('/api/admin/dokumen', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const status = url.searchParams.get('status') as StatusDokumen | null

    const hitungan: HitunganStatus = {
      semua: dokumen.length,
      draft: dokumen.filter((d) => d.status === 'draft').length,
      review: dokumen.filter((d) => d.status === 'review').length,
      berlaku: dokumen.filter((d) => d.status === 'berlaku').length,
      arsip: dokumen.filter((d) => d.status === 'arsip').length,
    }
    const cocok = dokumen
      .filter((d) => !status || d.status === status)
      .filter((d) => !q || d.judul.toLowerCase().includes(q))
      .sort((a, b) => b.tanggalRilis.localeCompare(a.tanggalRilis))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      hitungan,
    })
  }),

  // Sequence Diagram 6, langkah 1: server memvalidasi sebelum memberi tujuan unggahan.
  http.post('/api/dokumen/unggah/mulai', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(350)
    const body = (await request.json()) as Partial<MulaiUnggahInput>
    const errors = validasiMetadata(body.metadata)

    const tipe = body.tipeBerkas
    const ekstensi = body.nama?.split('.').pop()?.toLowerCase()
    if (!tipe || !TIPE_DIIZINKAN.includes(tipe) || ekstensi !== tipe) errors.berkas = 'Tipe berkas tidak diizinkan.'
    else if (!body.ukuranBytes || body.ukuranBytes <= 0) errors.berkas = 'Berkas kosong.'
    else if (body.ukuranBytes > BATAS_UNGGAH.maksBytes) errors.berkas = `Ukuran maksimal ${BATAS_UNGGAH.maksMb} MB.`
    if (Object.keys(errors).length > 0) return invalid(errors)

    const idSesi = crypto.randomUUID()
    sesi.set(idSesi, {
      idUser: user.id,
      nama: body.nama!,
      tipeBerkas: tipe!,
      ukuranBytes: body.ukuranBytes!,
      metadata: body.metadata as MetadataDokumen,
      kedaluwarsa: Date.now() + MASA_SESI_MS,
    })
    // Tujuan unggahan disimulasikan oleh middleware dev server (vite.config.ts), bukan MinIO.
    return HttpResponse.json({ idSesi, urlUnggah: `/mock-upload/${idSesi}`, fields: { key: `${idSesi}` } })
  }),

  // Langkah 3: server memeriksa berkas yang sudah tersimpan, lalu membuat dokumen berstatus Draft.
  http.post('/api/dokumen/unggah/selesai', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(400)
    const { idSesi } = (await request.json()) as { idSesi?: string }
    const s = idSesi ? sesi.get(idSesi) : undefined
    if (!s || s.idUser !== user.id || s.kedaluwarsa < Date.now()) {
      sesi.delete(idSesi ?? '')
      return notFound('Sesi unggahan tidak ditemukan atau sudah kedaluwarsa.')
    }
    sesi.delete(idSesi!)

    const baru: Dokumen = {
      id: Math.max(...dokumen.map((d) => d.id)) + 1,
      jenis: s.metadata.jenis as JenisDokumen,
      judul: s.metadata.judul.trim(),
      deskripsi: s.metadata.deskripsi.trim(),
      tipeBerkas: s.tipeBerkas,
      ukuranMb: Math.round((s.ukuranBytes / 1024 / 1024) * 100) / 100,
      versi: s.metadata.versi.trim(),
      sumber: s.metadata.sumber?.trim() || null,
      status: 'draft',
      visibilitas: s.metadata.visibilitas,
      jumlahUnduhan: 0,
      kategori: KATEGORI_SOP.find((k) => k.id === s.metadata.idKategori) ?? null,
      tanggalRilis: new Date().toISOString(),
    }
    dokumen.push(baru)
    catatAktivitas(user.id, 'dokumen', `Mengunggah dokumen: ${baru.judul}`)
    return HttpResponse.json(baru, { status: 201 })
  }),

  http.patch('/api/dokumen/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(350)
    const d = dokumen.find((x) => x.id === Number(params.id))
    if (!d) return notFound('Dokumen tidak ditemukan.')
    const { status } = (await request.json()) as { status?: StatusDokumen }
    if (!status || !(status in STATUS_LABEL)) return invalid({ status: 'Status tidak valid.' })
    // State machine: hanya perpindahan yang diizinkan dari status saat ini.
    if (!TRANSISI_STATUS[d.status].includes(status))
      return conflict(`Status ${STATUS_LABEL[d.status]} tidak dapat langsung menjadi ${STATUS_LABEL[status]}.`)
    const sebelum = d.status
    d.status = status
    catatAktivitas(user.id, 'dokumen', `Mengubah status ${d.judul} menjadi ${STATUS_LABEL[status]}`)
    // Dokumen yang baru terbit memberi tahu seluruh pengguna internal (Revisi 5.10).
    if (status === 'berlaku' && sebelum !== 'berlaku') {
      kirimNotifikasi(idUserPerRole('asn', 'akademisi', 'admin_opd', 'super_admin'), {
        kategori: 'dokumen',
        judul: d.jenis === 'sop' ? 'SOP baru telah diterbitkan' : 'Dokumen baru ditambahkan',
        pesan: d.judul,
        urlTujuan: `/dokumen/${d.id}`,
      }, user.id)
    }
    return HttpResponse.json(d)
  }),
]
