import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import type { Dokumen, JenisDokumen, Kelompok } from '@/features/dokumen/types'
import { catatAktivitas } from '../dbAktivitas'
import { dokumen, KATEGORI_SOP } from '../dbDokumen'
import { currentUser, notFound } from '../http'

const PER_PAGE = 6

const unauthorized = (message = 'Masuk untuk melihat dokumen ini.') =>
  HttpResponse.json({ message }, { status: 401 })

/**
 * Aturan visibilitas (Revisi bagian 3): anonim hanya dokumen berlaku berstatus publik;
 * pengguna login melihat dokumen berlaku dan review. Draft dan arsip tidak tampil di sisi pengguna.
 */
function terlihat(d: Dokumen, user: User | null) {
  if (!user) return d.status === 'berlaku' && d.visibilitas === 'publik'
  return d.status === 'berlaku' || d.status === 'review'
}

const kelompokDari = (v: string | null): Kelompok => (v === 'sop' ? 'sop' : 'dokumen')
const dalamKelompok = (d: Dokumen, k: Kelompok) => (k === 'sop' ? d.jenis === 'sop' : d.jenis !== 'sop')

const namaBerkas = (d: Dokumen) =>
  `${d.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}.${d.tipeBerkas}`

/** Dokumen yang ada tetapi tidak boleh dilihat: anonim diminta masuk, pengguna login diberi 404. */
function tidakTersedia(user: User | null, d: Dokumen | undefined) {
  if (!d) return notFound('Dokumen tidak ditemukan.')
  if (!user && d.status !== 'draft' && d.status !== 'arsip') return unauthorized()
  return notFound('Dokumen tidak ditemukan.')
}

export const dokumenHandlers = [
  // Route spesifik didaftarkan sebelum /api/dokumen/:id agar tidak tertangkap sebagai id.
  http.get('/api/dokumen/ringkasan', async ({ request }) => {
    const user = currentUser(request)
    const kelompok = kelompokDari(new URL(request.url).searchParams.get('kelompok'))
    await delay(200)
    const data = dokumen.filter((d) => dalamKelompok(d, kelompok) && terlihat(d, user))
    return HttpResponse.json({
      total: data.length,
      berlaku: data.filter((d) => d.status === 'berlaku').length,
      review: data.filter((d) => d.status === 'review').length,
      totalUnduhan: data.reduce((jumlah, d) => jumlah + d.jumlahUnduhan, 0),
    })
  }),

  http.get('/api/dokumen/kategori', ({ request }) => {
    const kelompok = kelompokDari(new URL(request.url).searchParams.get('kelompok'))
    return HttpResponse.json(kelompok === 'sop' ? KATEGORI_SOP : [])
  }),

  http.get('/api/dokumen', async ({ request }) => {
    const user = currentUser(request)
    const url = new URL(request.url)
    const kelompok = kelompokDari(url.searchParams.get('kelompok'))
    // SOP hanya untuk pengguna login, kecuali SOP berstatus publik yang dibuka lewat tautan langsung.
    if (kelompok === 'sop' && !user) return unauthorized('Masuk untuk melihat daftar SOP.')
    await delay(300)

    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const jenis = url.searchParams.get('jenis') as JenisDokumen | null
    const kategori = Number(url.searchParams.get('kategori')) || null
    const populer = url.searchParams.get('urut') === 'populer'

    const cocok = dokumen
      .filter((d) => dalamKelompok(d, kelompok) && terlihat(d, user))
      .filter((d) => !jenis || d.jenis === jenis)
      .filter((d) => !kategori || d.kategori?.id === kategori)
      .filter((d) => !q || d.judul.toLowerCase().includes(q) || d.deskripsi.toLowerCase().includes(q))
      .sort((a, b) => (populer ? b.jumlahUnduhan - a.jumlahUnduhan : b.tanggalRilis.localeCompare(a.tanggalRilis)))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
    })
  }),

  http.get('/api/dokumen/:id', async ({ request, params }) => {
    const user = currentUser(request)
    await delay(250)
    const d = dokumen.find((x) => x.id === Number(params.id))
    // Super Admin dapat membuka dokumen berstatus apa pun untuk pratinjau (termasuk draft dan arsip).
    if (!d || !(terlihat(d, user) || user?.role === 'super_admin')) return tidakTersedia(user, d)
    return HttpResponse.json(d)
  }),

  // Sequence Diagram 7: URL berumur pendek; server mencatat unduhan.
  http.get('/api/dokumen/:id/unduh', async ({ request, params }) => {
    const user = currentUser(request)
    await delay(300)
    const d = dokumen.find((x) => x.id === Number(params.id))
    // Super Admin dapat membuka dokumen berstatus apa pun untuk pratinjau (termasuk draft dan arsip).
    if (!d || !(terlihat(d, user) || user?.role === 'super_admin')) return tidakTersedia(user, d)
    d.jumlahUnduhan += 1
    if (user) catatAktivitas(user.id, 'unduh', `Mengunduh ${d.judul}`)
    return HttpResponse.json({ url: '/mock/berkas-contoh.txt', namaBerkas: namaBerkas(d) })
  }),
]
