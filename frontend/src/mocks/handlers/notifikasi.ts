import { delay, http, HttpResponse } from 'msw'
import { URUTAN_KATEGORI, type FilterKategori } from '@/features/notifikasi/types'
import { notifikasi } from '../dbNotifikasi'
import { currentUser, notFound, unauthorized } from '../http'

const PER_PAGE = 8

const kategoriValid = (v: string | null): v is FilterKategori => !!v && (URUTAN_KATEGORI as string[]).includes(v)

export const notifikasiHandlers = [
  // Dipakai lonceng di navbar.
  http.get('/api/notifikasi/ringkas', ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    return HttpResponse.json({ belumDibaca: notifikasi.filter((n) => n.idUser === user.id && !n.sudahDibaca).length })
  }),

  http.get('/api/notifikasi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(250)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const param = url.searchParams.get('kategori')
    const kategori: FilterKategori = kategoriValid(param) ? param : 'semua'

    const milik = notifikasi.filter((n) => n.idUser === user.id)
    const hitung = (k: FilterKategori) => milik.filter((n) => !n.sudahDibaca && (k === 'semua' || n.kategori === k)).length
    const cocok = milik
      .filter((n) => kategori === 'semua' || n.kategori === kategori)
      // Belum dibaca di atas, lalu yang terbaru.
      .sort((a, b) => Number(a.sudahDibaca) - Number(b.sudahDibaca) || b.dibuatPada.localeCompare(a.dibuatPada))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(({ idUser: _idUser, ...n }) => n),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      belumDibaca: Object.fromEntries(URUTAN_KATEGORI.map((k) => [k, hitung(k)])),
    })
  }),

  // Didaftarkan sebelum rute ber-parameter agar "dibaca-semua" tidak dianggap id.
  http.post('/api/notifikasi/dibaca-semua', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(200)
    const body = (await request.json().catch(() => ({}))) as { kategori?: string }
    let diperbarui = 0
    for (const n of notifikasi) {
      if (n.idUser === user.id && !n.sudahDibaca && (!kategoriValid(body.kategori ?? null) || body.kategori === 'semua' || n.kategori === body.kategori)) {
        n.sudahDibaca = true
        diperbarui += 1
      }
    }
    return HttpResponse.json({ diperbarui })
  }),

  http.post('/api/notifikasi/:id/dibaca', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(150)
    // Notifikasi milik pengguna lain diperlakukan sama seperti tidak ada.
    const n = notifikasi.find((x) => x.id === Number(params.id) && x.idUser === user.id)
    if (!n) return notFound('Notifikasi tidak ditemukan.')
    n.sudahDibaca = true
    return new HttpResponse(null, { status: 204 })
  }),
]
