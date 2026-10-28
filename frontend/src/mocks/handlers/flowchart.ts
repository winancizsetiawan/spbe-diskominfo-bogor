import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import {
  BATAS_FLOWCHART,
  KATEGORI_LABEL,
  ukuranBytes,
  type Flowchart,
  type FlowchartDetail,
  type FlowchartInput,
  type HitunganFlowchart,
  type KategoriProses,
} from '@/features/flowchart/types'
import type { StatusValidasi } from '@/features/katalog/types'
import { aplikasi, INSTANSI } from '../dbKatalog'
import { dokumen } from '../dbDokumen'
import { buatKode, flowchart, naikkanVersi, nextFlowchartId, type FlowchartRow } from '../dbFlowchart'
import { catatAktivitas } from '../dbAktivitas'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 6
const NS_BPMN = 'http://www.omg.org/spec/BPMN/20100524/MODEL'

const forbidden = (message = 'Anda tidak berhak mengakses data ini.') => HttpResponse.json({ message }, { status: 403 })

/** Admin OPD hanya instansinya sendiri; Super Admin semua; role lain tidak punya akses. */
function lingkup(user: User): number | 'semua' | null {
  if (user.role === 'super_admin') return 'semua'
  if (user.role === 'admin_opd') return user.instansi.id
  return null
}

const terlihat = (row: FlowchartRow, scope: number | 'semua') => scope === 'semua' || row.idInstansi === scope

export function keFlowchart(row: FlowchartRow): Flowchart {
  return {
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    deskripsi: row.deskripsi,
    kategori: row.kategori,
    jenis: row.jenis,
    versi: row.versi,
    pic: row.pic,
    instansi: INSTANSI.find((i) => i.id === row.idInstansi)!,
    status: row.status,
    catatanValidasi: row.catatanValidasi,
    diperbaruiPada: row.diperbaruiPada,
    aplikasi: row.idAplikasi.map((id) => ({ id, nama: aplikasi.find((a) => a.id === id)?.nama ?? `Aplikasi ${id}` })),
    sop: row.idSop.map((id) => ({ id, judul: dokumen.find((d) => d.id === id)?.judul ?? `SOP ${id}` })),
  }
}

function keDetail(row: FlowchartRow): FlowchartDetail {
  return { ...keFlowchart(row), bpmnXml: row.bpmnXml, riwayat: [...row.riwayat].sort((a, b) => b.tanggal.localeCompare(a.tanggal)) }
}

/** Server memeriksa ulang isi diagram: FE hanya memeriksa untuk kenyamanan. */
function periksaBpmn(xml: unknown): string | null {
  if (typeof xml !== 'string' || xml.trim().length === 0) return 'Diagram wajib diisi.'
  if (ukuranBytes(xml) > BATAS_FLOWCHART.maksBytes) return 'Ukuran diagram maksimal 10 MB.'
  const dok = new DOMParser().parseFromString(xml, 'application/xml')
  if (dok.getElementsByTagName('parsererror').length > 0) return 'Berkas bukan XML yang valid.'
  if (dok.documentElement.localName !== 'definitions' || dok.documentElement.namespaceURI !== NS_BPMN)
    return 'Berkas bukan BPMN 2.0.'
  if (dok.getElementsByTagNameNS(NS_BPMN, 'startEvent').length === 0 || dok.getElementsByTagNameNS(NS_BPMN, 'endEvent').length === 0)
    return 'Diagram harus memuat peristiwa awal dan peristiwa akhir.'
  return null
}

function validasi(body: Partial<FlowchartInput>, idInstansi: number): Record<string, string> {
  const errors: Record<string, string> = {}
  const nama = (body.nama ?? '').trim()
  if (nama.length < BATAS_FLOWCHART.namaMin || nama.length > BATAS_FLOWCHART.namaMax)
    errors.nama = `Nama harus ${BATAS_FLOWCHART.namaMin}–${BATAS_FLOWCHART.namaMax} karakter.`
  if ((body.deskripsi ?? '').length > BATAS_FLOWCHART.deskripsiMax) errors.deskripsi = `Deskripsi maksimal ${BATAS_FLOWCHART.deskripsiMax} karakter.`
  if (!body.kategori || !(body.kategori in KATEGORI_LABEL)) errors.kategori = 'Kategori tidak valid.'
  if (body.jenis !== 'as_is' && body.jenis !== 'to_be') errors.jenis = 'Jenis tidak valid.'
  const pic = (body.pic ?? '').trim()
  if (pic.length < BATAS_FLOWCHART.picMin || pic.length > BATAS_FLOWCHART.picMax)
    errors.pic = `PIC harus ${BATAS_FLOWCHART.picMin}–${BATAS_FLOWCHART.picMax} karakter.`
  if ((body.catatanRevisi ?? '').length > BATAS_FLOWCHART.catatanMax) errors.catatanRevisi = `Catatan maksimal ${BATAS_FLOWCHART.catatanMax} karakter.`
  // Aplikasi terkait harus milik instansi pemilik flowchart; SOP harus berupa dokumen SOP.
  if (!Array.isArray(body.idAplikasi) || body.idAplikasi.some((id) => !aplikasi.some((a) => a.id === id && a.idInstansi === idInstansi)))
    errors.idAplikasi = 'Pilih hanya aplikasi milik instansi ini.'
  if (!Array.isArray(body.idSop) || body.idSop.some((id) => !dokumen.some((d) => d.id === id && d.jenis === 'sop')))
    errors.idSop = 'Pilih hanya dokumen SOP.'
  const salahBpmn = periksaBpmn(body.bpmnXml)
  if (salahBpmn) errors.bpmnXml = salahBpmn
  return errors
}

export const flowchartHandlers = [
  // Rute spesifik didaftarkan sebelum /api/flowchart/:id.
  http.get('/api/flowchart/opsi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(200)
    return HttpResponse.json({
      aplikasi: aplikasi.filter((a) => scope === 'semua' || a.idInstansi === scope).map((a) => ({ id: a.id, nama: a.nama })),
      sop: dokumen.filter((d) => d.jenis === 'sop' && d.status !== 'draft' && d.status !== 'arsip').map((d) => ({ id: d.id, judul: d.judul })),
    })
  }),

  http.get('/api/flowchart', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const kategori = url.searchParams.get('kategori') as KategoriProses | null
    const status = url.searchParams.get('status') as StatusValidasi | null

    const milik = flowchart.filter((r) => terlihat(r, scope))
    const hitungan: HitunganFlowchart = {
      total: milik.length,
      dipublikasikan: milik.filter((r) => r.status === 'disetujui').length,
      menunggu: milik.filter((r) => r.status === 'menunggu').length,
      draft: milik.filter((r) => r.status === 'draft' || r.status === 'perlu_revisi').length,
      perKategori: {
        semua: milik.length,
        utama: milik.filter((r) => r.kategori === 'utama').length,
        pendukung: milik.filter((r) => r.kategori === 'pendukung').length,
        manajemen: milik.filter((r) => r.kategori === 'manajemen').length,
      },
    }
    const cocok = milik
      .filter((r) => !kategori || r.kategori === kategori)
      .filter((r) => !status || r.status === status)
      .filter((r) => !q || r.nama.toLowerCase().includes(q) || r.kode.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q))
      .sort((a, b) => b.diperbaruiPada.localeCompare(a.diperbaruiPada))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(keFlowchart),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      hitungan,
    })
  }),

  http.get('/api/flowchart/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(250)
    const row = flowchart.find((r) => r.id === Number(params.id))
    if (!row) return notFound('Flowchart tidak ditemukan.')
    if (!terlihat(row, scope)) return forbidden('Flowchart ini milik instansi lain.')
    return HttpResponse.json(keDetail(row))
  }),

  http.post('/api/flowchart', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    // Super Admin tidak punya instansi pemilik; pembuatan dilakukan Admin OPD.
    if (user.role !== 'admin_opd') return forbidden('Flowchart baru dibuat oleh Admin OPD untuk instansinya.')
    await delay(500)
    const body = (await request.json()) as Partial<FlowchartInput>
    const errors = validasi(body, user.instansi.id)
    if (Object.keys(errors).length > 0) return invalid(errors)

    const sekarang = new Date().toISOString()
    const row: FlowchartRow = {
      id: nextFlowchartId(),
      kode: buatKode(body.nama!),
      nama: body.nama!.trim(),
      deskripsi: (body.deskripsi ?? '').trim(),
      kategori: body.kategori!,
      jenis: body.jenis!,
      versi: '1.0',
      pic: body.pic!.trim(),
      idInstansi: user.instansi.id,
      status: 'draft',
      catatanValidasi: null,
      diperbaruiPada: sekarang,
      idAplikasi: body.idAplikasi!,
      idSop: body.idSop!,
      bpmnXml: body.bpmnXml!,
      riwayat: [{ versi: '1.0', catatan: 'Versi awal', oleh: user.nama, tanggal: sekarang }],
    }
    flowchart.push(row)
    catatAktivitas(user.id, 'flowchart', `Membuat flowchart ${row.nama}`)
    return HttpResponse.json(keDetail(row), { status: 201 })
  }),

  http.put('/api/flowchart/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(500)
    const row = flowchart.find((r) => r.id === Number(params.id))
    if (!row) return notFound('Flowchart tidak ditemukan.')
    if (!terlihat(row, scope)) return forbidden('Flowchart ini milik instansi lain.')
    if (row.status === 'menunggu') return conflict('Flowchart sedang menunggu validasi dan tidak dapat diubah.')
    const body = (await request.json()) as Partial<FlowchartInput>
    const errors = validasi(body, row.idInstansi)
    if (Object.keys(errors).length > 0) return invalid(errors)

    // Mengubah membuat versi baru dan mengembalikan status ke Draft (Revisi 5.6 dan 5.7).
    const sekarang = new Date().toISOString()
    row.versi = naikkanVersi(row.versi)
    row.nama = body.nama!.trim()
    row.deskripsi = (body.deskripsi ?? '').trim()
    row.kategori = body.kategori!
    row.jenis = body.jenis!
    row.pic = body.pic!.trim()
    row.idAplikasi = body.idAplikasi!
    row.idSop = body.idSop!
    row.bpmnXml = body.bpmnXml!
    row.status = 'draft'
    row.catatanValidasi = null
    row.diperbaruiPada = sekarang
    row.riwayat.push({ versi: row.versi, catatan: (body.catatanRevisi ?? '').trim() || 'Perubahan diagram', oleh: user.nama, tanggal: sekarang })
    catatAktivitas(user.id, 'flowchart', `Mengubah flowchart ${row.nama} menjadi versi ${row.versi}`)
    return HttpResponse.json(keDetail(row))
  }),
]
