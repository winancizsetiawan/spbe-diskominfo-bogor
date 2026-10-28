import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import {
  BATAS_APLIKASI,
  BISA_DIAJUKAN,
  cariNodeRaa,
  hitungKesesuaian,
  KATEGORI_APLIKASI,
  statusRaaDari,
  type Aplikasi,
  type AplikasiInput,
  type StatusRaa,
  type StatusValidasi,
} from '@/features/katalog/types'
import { aplikasi, INSTANSI, nextAplikasiId, REFERENSI_RAA, type AplikasiRow } from '../dbKatalog'
import { catatAktivitas } from '../dbAktivitas'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 6

const forbidden = (message = 'Anda tidak berhak mengakses data ini.') =>
  HttpResponse.json({ message }, { status: 403 })

/** Admin OPD hanya instansinya sendiri; Super Admin semua; role lain tidak punya akses katalog. */
function lingkup(user: User): number | 'semua' | null {
  if (user.role === 'super_admin') return 'semua'
  if (user.role === 'admin_opd') return user.instansi.id
  return null
}

const terlihat = (row: AplikasiRow, scope: number | 'semua') => scope === 'semua' || row.idInstansi === scope

export function keAplikasi(row: AplikasiRow): Aplikasi {
  const nilai = hitungKesesuaian(row)
  return {
    id: row.id,
    nama: row.nama,
    deskripsi: row.deskripsi,
    kategori: row.kategori,
    raa: row.raa,
    instansi: INSTANSI.find((i) => i.id === row.idInstansi)!,
    statusValidasi: row.statusValidasi,
    statusRaa: statusRaaDari(nilai),
    nilaiKesesuaian: nilai,
    catatanValidasi: row.catatanValidasi,
    diperbaruiPada: row.diperbaruiPada,
  }
}

function validasi(body: Partial<AplikasiInput>, perluInstansi: boolean): Record<string, string> {
  const errors: Record<string, string> = {}
  const nama = typeof body.nama === 'string' ? body.nama.trim() : ''
  if (nama.length < BATAS_APLIKASI.namaMin || nama.length > BATAS_APLIKASI.namaMax)
    errors.nama = `Nama harus ${BATAS_APLIKASI.namaMin}–${BATAS_APLIKASI.namaMax} karakter.`
  if ((body.deskripsi ?? '').length > BATAS_APLIKASI.deskripsiMax)
    errors.deskripsi = `Deskripsi maksimal ${BATAS_APLIKASI.deskripsiMax} karakter.`
  if (body.kategori && !(KATEGORI_APLIKASI as readonly string[]).includes(body.kategori))
    errors.kategori = 'Kategori tidak dikenal.'

  // Setiap level RAA harus anak dari level di atasnya.
  const { level1, level2, level3 } = body.raa ?? { level1: null, level2: null, level3: null }
  const n1 = cariNodeRaa(REFERENSI_RAA, level1)
  const n2 = cariNodeRaa(n1?.anak, level2)
  const n3 = cariNodeRaa(n2?.anak, level3)
  if ((level1 && !n1) || (level2 && !n2) || (level3 && !n3))
    errors.raa = 'Kombinasi kode RAA tidak sesuai referensi.'

  if (perluInstansi && !INSTANSI.some((i) => i.id === body.idInstansi)) errors.idInstansi = 'Pilih instansi pemilik.'
  return errors
}

function terapkan(row: AplikasiRow, body: Partial<AplikasiInput>) {
  row.nama = body.nama!.trim()
  row.deskripsi = (body.deskripsi ?? '').trim()
  row.kategori = body.kategori || null
  row.raa = body.raa ?? { level1: null, level2: null, level3: null }
  // Setiap perubahan mengembalikan status ke Draft (Revisi 5.6).
  row.statusValidasi = 'draft'
  row.catatanValidasi = null
  row.diperbaruiPada = new Date().toISOString()
}

export const katalogHandlers = [
  http.get('/api/referensi/raa', ({ request }) =>
    currentUser(request) ? HttpResponse.json(REFERENSI_RAA) : unauthorized(),
  ),

  http.get('/api/referensi/instansi', ({ request }) =>
    currentUser(request) ? HttpResponse.json(INSTANSI) : unauthorized(),
  ),

  // Route spesifik didaftarkan sebelum /api/aplikasi/:id agar tidak tertangkap sebagai id.
  http.get('/api/aplikasi/ringkasan', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(200)
    const status = aplikasi.filter((r) => terlihat(r, scope)).map((r) => statusRaaDari(hitungKesesuaian(r)))
    return HttpResponse.json({
      total: status.length,
      sesuai: status.filter((s) => s === 'sesuai').length,
      perluPenyesuaian: status.filter((s) => s === 'perlu_penyesuaian').length,
      belum: status.filter((s) => s === 'belum').length,
    })
  }),

  http.get('/api/aplikasi/siap-diajukan', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin_opd') return forbidden()
    await delay(200)
    return HttpResponse.json(
      aplikasi
        .filter((r) => r.idInstansi === user.instansi.id && BISA_DIAJUKAN.includes(r.statusValidasi))
        .map((r) => ({ id: r.id, nama: r.nama })),
    )
  }),

  http.get('/api/aplikasi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const statusValidasi = url.searchParams.get('statusValidasi') as StatusValidasi | null
    const statusRaa = url.searchParams.get('statusRaa') as StatusRaa | null

    const cocok = aplikasi
      .filter((r) => terlihat(r, scope))
      .map(keAplikasi)
      .filter((a) => !q || a.nama.toLowerCase().includes(q))
      .filter((a) => !statusValidasi || a.statusValidasi === statusValidasi)
      .filter((a) => !statusRaa || a.statusRaa === statusRaa)
      .sort((a, b) => b.diperbaruiPada.localeCompare(a.diperbaruiPada))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
    })
  }),

  http.get('/api/aplikasi/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(200)
    const row = aplikasi.find((r) => r.id === Number(params.id))
    if (!row) return notFound('Aplikasi tidak ditemukan.')
    if (!terlihat(row, scope)) return forbidden('Aplikasi ini milik instansi lain.')
    return HttpResponse.json(keAplikasi(row))
  }),

  http.post('/api/aplikasi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(400)
    const body = (await request.json()) as Partial<AplikasiInput>
    const errors = validasi(body, scope === 'semua')
    if (Object.keys(errors).length > 0) return invalid(errors)

    const row = {
      id: nextAplikasiId(),
      idInstansi: scope === 'semua' ? body.idInstansi! : scope,
    } as AplikasiRow
    terapkan(row, body)
    aplikasi.push(row)
    catatAktivitas(user.id, 'aplikasi', `Menambah aplikasi ${row.nama}`)
    return HttpResponse.json(keAplikasi(row), { status: 201 })
  }),

  http.put('/api/aplikasi/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const scope = lingkup(user)
    if (!scope) return forbidden()
    await delay(400)
    const row = aplikasi.find((r) => r.id === Number(params.id))
    if (!row) return notFound('Aplikasi tidak ditemukan.')
    if (!terlihat(row, scope)) return forbidden('Aplikasi ini milik instansi lain.')
    if (row.statusValidasi === 'menunggu') return conflict('Data sedang menunggu validasi.')
    const body = (await request.json()) as Partial<AplikasiInput>
    const errors = validasi(body, false)
    if (Object.keys(errors).length > 0) return invalid(errors)
    terapkan(row, body)
    catatAktivitas(user.id, 'aplikasi', `Mengubah data aplikasi ${row.nama}`)
    return HttpResponse.json(keAplikasi(row))
  }),
]
