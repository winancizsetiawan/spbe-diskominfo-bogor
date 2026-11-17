import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import {
  BATAS,
  TIPE_LAMPIRAN,
  type Balasan,
  type BalasInput,
  type BuatThreadInput,
  type LaporanInput,
  type Lampiran,
  type PenggunaForum,
  type ThreadDetail,
  type ThreadRingkas,
} from '@/features/forum/types'
import {
  balasan,
  KATEGORI,
  lampiranForum,
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
import { INSTANSI_SEMUA, pengguna } from '../dbPengguna'
import { idUserDariNama, idUserPerRole, kirimNotifikasi } from '../dbNotifikasi'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 5

function keyPengguna(id: number): PenggunaForum | null {
  const p = pengguna.find((x) => x.id === id)
  if (!p) return null
  return { id: p.id, nama: p.nama, instansi: INSTANSI_SEMUA.find((i) => i.id === p.idInstansi)?.nama ?? 'Pemerintah Kota Bogor' }
}

const keLampiran = (ids: string[] = []): Lampiran[] =>
  ids.flatMap((id) => {
    const l = lampiranForum.get(id)
    return l ? [{ id: l.id, nama: l.nama, tipe: l.tipe, ukuran: l.ukuran, url: l.url }] : []
  })

const pembuat = (t: ThreadRow, user: User) => t.penulis.nama === user.nama
/** Bila thread punya penerima, hanya penerima dan pembuat thread yang boleh membalas. */
const bolehMembalas = (t: ThreadRow, user: User) => !t.penerima?.length || pembuat(t, user) || t.penerima.includes(user.id)

/** Validasi penerima: buang duplikat dan diri sendiri, maksimal 5, harus pengguna aktif. */
function rapikanPenerima(ids: unknown, user: User): number[] | string {
  if (!Array.isArray(ids)) return []
  const unik = [...new Set(ids.filter((x): x is number => typeof x === 'number' && x !== user.id))]
  if (unik.length > BATAS.penerimaMax) return `Maksimal ${BATAS.penerimaMax} penerima.`
  if (unik.some((id) => pengguna.find((p) => p.id === id)?.statusAkun !== 'aktif')) return 'Penerima tidak ditemukan atau tidak aktif.'
  return unik
}

/** Lampiran harus milik pengunggah dan belum dipakai kiriman lain. */
function ambilLampiran(ids: unknown, user: User): string[] | string {
  if (!Array.isArray(ids)) return []
  if (ids.length > BATAS.lampiranMax) return `Maksimal ${BATAS.lampiranMax} lampiran.`
  const ok = ids.every((id) => {
    const l = typeof id === 'string' ? lampiranForum.get(id) : undefined
    return l && l.idPengunggah === user.id && !l.dipakai
  })
  return ok ? (ids as string[]) : 'Lampiran tidak valid atau sudah dipakai. Unggah ulang berkasnya.'
}

const pakaiLampiran = (ids: string[]) => ids.forEach((id) => (lampiranForum.get(id)!.dipakai = true))

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
    penerima: (t.penerima ?? []).map(keyPengguna).filter((p): p is PenggunaForum => p !== null),
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
    lampiran: keLampiran(b.lampiran),
  }
}

function detail(t: ThreadRow, user: User): ThreadDetail {
  return {
    ...ringkas(t),
    konten: t.konten,
    lampiran: keLampiran(t.lampiran),
    balasan: balasan.filter((b) => b.threadId === t.id && !b.tersembunyi).map((b) => keBalasan(b, user)),
    bisaMembalas: bolehMembalas(t, user),
    bisaMenugaskan: pembuat(t, user) || user.role === 'super_admin',
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
    const penerima = rapikanPenerima(body.penerima, user)
    if (typeof penerima === 'string') errors.penerima = penerima
    const lamp = ambilLampiran(body.lampiran, user)
    if (typeof lamp === 'string') errors.lampiran = lamp
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
      penerima: penerima as number[],
      lampiran: lamp as string[],
    }
    pakaiLampiran(lamp as string[])
    threads.push(row)
    kirimNotifikasi(row.penerima!, {
      kategori: 'forum',
      judul: 'Anda ditugaskan menjawab diskusi',
      pesan: row.judul,
      urlTujuan: `/forum/${row.id}`,
    }, user.id)
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
    if (!bolehMembalas(t, user))
      return HttpResponse.json({ message: 'Thread ini ditujukan kepada pengguna tertentu. Anda hanya dapat membaca diskusinya.' }, { status: 403 })
    const { konten, lampiran: idLampiran } = (await request.json()) as Partial<BalasInput>
    const adaLampiran = Array.isArray(idLampiran) && idLampiran.length > 0
    if ((panjang(konten) === 0 && !adaLampiran) || panjang(konten) > BATAS.balasanMax)
      return invalid({ konten: `Balasan harus 1–${BATAS.balasanMax} karakter.` })
    const lamp = ambilLampiran(idLampiran, user)
    if (typeof lamp === 'string') return invalid({ lampiran: lamp })

    const row: BalasanRow = {
      id: nextBalasanId(),
      threadId: t.id,
      konten: (konten ?? '').trim(),
      penulis: penulisDari(user),
      dibuatPada: new Date().toISOString(),
      penilai: new Set(),
      lampiran: lamp,
    }
    pakaiLampiran(lamp)
    balasan.push(row)
    catatAktivitas(user.id, 'balasan', `Membalas thread: ${t.judul}`)
    // Pembuat thread diberi tahu; membalas thread sendiri tidak memicu notifikasi.
    kirimNotifikasi([idUserDariNama(t.penulis.nama), ...(t.penerima ?? [])], {
      kategori: 'forum',
      judul: 'Balasan untuk thread Anda',
      pesan: t.judul,
      urlTujuan: `/forum/${t.id}`,
    }, user.id)
    return HttpResponse.json(keBalasan(row, user), { status: 201 })
  }),

  http.put('/api/forum/thread/:id/penerima', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(300)
    const t = threads.find((x) => x.id === Number(params.id) && x.status !== 'tersembunyi')
    if (!t) return notFound('Thread tidak ditemukan.')
    if (!pembuat(t, user) && user.role !== 'super_admin')
      return HttpResponse.json({ message: 'Hanya pembuat thread atau Super Admin yang dapat mengubah penugasan.' }, { status: 403 })
    if (t.status !== 'aktif') return conflict('Thread sudah dikunci.')
    const body = (await request.json()) as { penerima?: unknown }
    const idPembuat = idUserDariNama(t.penulis.nama) ?? -1
    const penerima = rapikanPenerima(body.penerima, { ...user, id: idPembuat })
    if (typeof penerima === 'string') return invalid({ penerima })
    const lama = new Set(t.penerima ?? [])
    t.penerima = penerima
    kirimNotifikasi(penerima.filter((id) => !lama.has(id)), {
      kategori: 'forum',
      judul: 'Anda ditugaskan menjawab diskusi',
      pesan: t.judul,
      urlTujuan: `/forum/${t.id}`,
    }, user.id)
    return HttpResponse.json({ penerima: ringkas(t).penerima })
  }),

  http.get('/api/forum/pengguna', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(150)
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase().trim() ?? ''
    const hasil = pengguna
      .filter((p) => p.statusAkun === 'aktif' && p.id !== user.id)
      .map((p) => keyPengguna(p.id)!)
      .filter((p) => !q || p.nama.toLowerCase().includes(q) || p.instansi.toLowerCase().includes(q))
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .slice(0, 10)
    return HttpResponse.json(hasil)
  }),

  http.post('/api/forum/lampiran', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(400)
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size === 0) return HttpResponse.json({ message: 'Berkas tidak ditemukan.' }, { status: 400 })
    if (file.size > BATAS.lampiranBytes) return HttpResponse.json({ message: 'Ukuran lampiran maksimal 5 MB.' }, { status: 413 })
    if (!(TIPE_LAMPIRAN as readonly string[]).includes(file.type))
      return HttpResponse.json({ message: 'Lampiran harus berupa gambar (PNG, JPG, WEBP) atau PDF.' }, { status: 422 })
    const id = crypto.randomUUID().replaceAll('-', '')
    const row = { id, nama: file.name, tipe: file.type, ukuran: file.size, url: URL.createObjectURL(file), idPengunggah: user.id, dipakai: false }
    lampiranForum.set(id, row)
    return HttpResponse.json({ id, nama: row.nama, tipe: row.tipe, ukuran: row.ukuran, url: row.url }, { status: 201 })
  }),

  http.put('/api/forum/balasan/:id/nilai', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(200)
    const b = balasan.find((x) => x.id === Number(params.id) && !x.tersembunyi)
    if (!b) return notFound('Balasan tidak ditemukan.')
    const tb = threads.find((t) => t.id === b.threadId)
    if (tb?.status !== 'aktif') return conflict('Thread sudah dikunci.')
    if (!bolehMembalas(tb, user)) return HttpResponse.json({ message: 'Anda hanya dapat membaca diskusi ini.' }, { status: 403 })
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
