import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import {
  BATAS,
  type Balasan,
  type BuatThreadInput,
  type LaporanInput,
  type ThreadDetail,
  type ThreadRingkas,
} from '@/features/forum/types'
import {
  balasan,
  KATEGORI,
  laporan,
  nextBalasanId,
  nextLaporanId,
  nextThreadId,
  penulisDari,
  threads,
  type BalasanRow,
  type ThreadRow,
} from '../db'
import { catatAktivitas } from '../dbAktivitas'
import { idUserDariNama, idUserPerRole, kirimNotifikasi } from '../dbNotifikasi'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 5

export function ringkas(t: ThreadRow): ThreadRingkas {
  return {
    id: t.id,
    judul: t.judul,
    kategori: KATEGORI.find((k) => k.id === t.idKategori)!,
    penulis: t.penulis,
    dibuatPada: t.dibuatPada,
    jumlahBalasan: balasan.filter((b) => b.threadId === t.id && !b.tersembunyi).length,
    dilihat: t.dilihat,
    status: t.status,
  }
}

function keBalasan(b: BalasanRow, user: User): Balasan {
  return {
    id: b.id,
    konten: b.konten,
    penulis: b.penulis,
    dibuatPada: b.dibuatPada,
    jumlahNilai: b.penilai.size,
    sudahDinilai: b.penilai.has(user.id),
  }
}

function detail(t: ThreadRow, user: User): ThreadDetail {
  return {
    ...ringkas(t),
    konten: t.konten,
    balasan: balasan.filter((b) => b.threadId === t.id && !b.tersembunyi).map((b) => keBalasan(b, user)),
  }
}

const panjang = (v: unknown) => (typeof v === 'string' ? v.trim().length : 0)

export const forumHandlers = [
  http.get('/api/forum/kategori', ({ request }) =>
    currentUser(request) ? HttpResponse.json(KATEGORI) : unauthorized(),
  ),

  http.get('/api/forum/thread', async ({ request }) => {
    if (!currentUser(request)) return unauthorized()
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const kategori = Number(url.searchParams.get('kategori')) || null
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''

    const cocok = threads
      .filter((t) => t.status !== 'tersembunyi')
      .filter((t) => !kategori || t.idKategori === kategori)
      .filter((t) => !q || t.judul.toLowerCase().includes(q) || t.konten.toLowerCase().includes(q))
      .sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(ringkas),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
    })
  }),

  http.post('/api/forum/thread', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(400)
    const body = (await request.json()) as Partial<BuatThreadInput>
    const errors: Record<string, string> = {}
    if (!KATEGORI.some((k) => k.id === body.idKategori)) errors.idKategori = 'Kategori tidak valid.'
    if (panjang(body.judul) < BATAS.judulMin || panjang(body.judul) > BATAS.judulMax)
      errors.judul = `Judul harus ${BATAS.judulMin}–${BATAS.judulMax} karakter.`
    if (panjang(body.konten) < BATAS.kontenMin || panjang(body.konten) > BATAS.kontenMax)
      errors.konten = `Isi harus ${BATAS.kontenMin}–${BATAS.kontenMax} karakter.`
    if (Object.keys(errors).length > 0) return invalid(errors)

    const row: ThreadRow = {
      id: nextThreadId(),
      idKategori: body.idKategori!,
      judul: body.judul!.trim(),
      konten: body.konten!.trim(),
      penulis: penulisDari(user),
      dibuatPada: new Date().toISOString(),
      dilihat: 0,
      status: 'aktif',
    }
    threads.push(row)
    catatAktivitas(user.id, 'thread', `Membuat thread: ${row.judul}`)
    return HttpResponse.json(detail(row, user), { status: 201 })
  }),

  http.get('/api/forum/thread/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(250)
    const t = threads.find((x) => x.id === Number(params.id) && x.status !== 'tersembunyi')
    if (!t) return notFound('Thread tidak ditemukan.')
    t.dilihat += 1
    return HttpResponse.json(detail(t, user))
  }),

  http.post('/api/forum/thread/:id/balasan', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(300)
    const t = threads.find((x) => x.id === Number(params.id) && x.status !== 'tersembunyi')
    if (!t) return notFound('Thread tidak ditemukan.')
    if (t.status !== 'aktif') return conflict('Thread sudah dikunci.')
    const { konten } = (await request.json()) as { konten?: string }
    if (panjang(konten) === 0 || panjang(konten) > BATAS.balasanMax)
      return invalid({ konten: `Balasan harus 1–${BATAS.balasanMax} karakter.` })

    const row: BalasanRow = {
      id: nextBalasanId(),
      threadId: t.id,
      konten: konten!.trim(),
      penulis: penulisDari(user),
      dibuatPada: new Date().toISOString(),
      penilai: new Set(),
    }
    balasan.push(row)
    catatAktivitas(user.id, 'balasan', `Membalas thread: ${t.judul}`)
    // Pembuat thread diberi tahu; membalas thread sendiri tidak memicu notifikasi.
    kirimNotifikasi([idUserDariNama(t.penulis.nama)], {
      kategori: 'forum',
      judul: 'Balasan untuk thread Anda',
      pesan: t.judul,
      urlTujuan: `/forum/${t.id}`,
    }, user.id)
    return HttpResponse.json(keBalasan(row, user), { status: 201 })
  }),

  http.put('/api/forum/balasan/:id/nilai', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(200)
    const b = balasan.find((x) => x.id === Number(params.id) && !x.tersembunyi)
    if (!b) return notFound('Balasan tidak ditemukan.')
    if (threads.find((t) => t.id === b.threadId)?.status !== 'aktif') return conflict('Thread sudah dikunci.')
    if (b.penilai.has(user.id)) b.penilai.delete(user.id)
    else b.penilai.add(user.id)
    return HttpResponse.json({ jumlahNilai: b.penilai.size, sudahDinilai: b.penilai.has(user.id) })
  }),

  http.post('/api/forum/laporan', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(300)
    const body = (await request.json()) as Partial<LaporanInput>
    if (panjang(body.alasan) < BATAS.alasanMin || panjang(body.alasan) > BATAS.alasanMax)
      return invalid({ alasan: `Alasan harus ${BATAS.alasanMin}–${BATAS.alasanMax} karakter.` })
    const ada =
      body.targetTipe === 'thread'
        ? threads.some((t) => t.id === body.targetId && t.status !== 'tersembunyi')
        : body.targetTipe === 'balasan' && balasan.some((b) => b.id === body.targetId && !b.tersembunyi)
    if (!ada) return notFound('Konten yang dilaporkan tidak ditemukan.')
    // Satu laporan terbuka per pengguna untuk konten yang sama.
    if (laporan.some((l) => l.targetTipe === body.targetTipe && l.targetId === body.targetId && l.pelapor === user.nama && l.status === 'baru'))
      return conflict('Anda sudah melaporkan konten ini dan laporan Anda sedang ditinjau.')
    laporan.push({
      id: nextLaporanId(),
      targetTipe: body.targetTipe!,
      targetId: body.targetId!,
      pelapor: user.nama,
      alasan: body.alasan!.trim(),
      dibuatPada: new Date().toISOString(),
      status: 'baru',
    })
    catatAktivitas(user.id, 'laporan', `Melaporkan ${body.targetTipe === 'thread' ? 'thread' : 'balasan'}`)
    kirimNotifikasi(idUserPerRole('super_admin'), {
      kategori: 'forum',
      judul: 'Laporan konten forum baru',
      pesan: `${user.nama} melaporkan ${body.targetTipe === 'thread' ? 'sebuah thread' : 'sebuah balasan'}.`,
      urlTujuan: '/admin/moderasi',
    })
    return new HttpResponse(null, { status: 201 })
  }),
]
