import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import type { DaftarKursus, Kursus, KursusDetail, Sertifikat, TipeMedia, Tingkat } from '@/features/pembelajaran/types'
import { kirimNotifikasi } from '../dbNotifikasi'
import { currentUser, notFound, unauthorized } from '../http'

interface KursusRow {
  id: number
  judul: string
  deskripsi: string
  kategori: string
  tingkat: Tingkat
  durasiJam: number
  adaSertifikat: boolean
  materi: { id: number; judul: string; tipe: TipeMedia; url: string }[]
}

const m = (id: number, judul: string, tipe: TipeMedia = 'video') => ({ id, judul, tipe, url: 'https://www.youtube.com/' })

export const kursus: KursusRow[] = [
  { id: 1, judul: 'Pengantar SPBE', deskripsi: 'Dasar-dasar Sistem Pemerintahan Berbasis Elektronik dan kerangka regulasinya.', kategori: 'Dasar SPBE', tingkat: 'dasar', durasiJam: 2, adaSertifikat: true, materi: [m(1, 'Apa itu SPBE'), m(2, 'Regulasi SPBE', 'tautan'), m(3, 'Domain dan aspek SPBE')] },
  { id: 2, judul: 'Arsitektur SPBE dan RAA', deskripsi: 'Menyusun dan mengklasifikasikan aplikasi sesuai Referensi Arsitektur Aplikasi.', kategori: 'Arsitektur', tingkat: 'menengah', durasiJam: 4, adaSertifikat: true, materi: [m(1, 'Konsep arsitektur'), m(2, 'Klasifikasi RAA'), m(3, 'Studi kasus aplikasi OPD', 'tautan'), m(4, 'Evaluasi kesesuaian')] },
  { id: 3, judul: 'Keamanan Informasi Pemerintah', deskripsi: 'Praktik keamanan informasi, manajemen akses, dan penanganan insiden.', kategori: 'Keamanan', tingkat: 'menengah', durasiJam: 3, adaSertifikat: true, materi: [m(1, 'Prinsip keamanan'), m(2, 'Penanganan insiden', 'audio'), m(3, 'Backup dan pemulihan')] },
  { id: 4, judul: 'Integrasi Data Antar-OPD', deskripsi: 'Pertukaran data lewat SPLP dan tata kelola interoperabilitas.', kategori: 'Data', tingkat: 'lanjutan', durasiJam: 5, adaSertifikat: false, materi: [m(1, 'Interoperabilitas'), m(2, 'SPLP', 'tautan'), m(3, 'Tata kelola data'), m(4, 'Praktik integrasi')] },
]

/** Progres per pengguna: kursus -> id materi selesai; sertifikat terbit sekali saat semua materi selesai. */
const selesai = new Map<string, Set<number>>()
const sertifikat = new Map<string, Sertifikat>()
let nomorSeq = 0

const kunci = (u: User, idKursus: number) => `${u.id}:${idKursus}`

function keRingkas(k: KursusRow, u: User): Kursus {
  const jumlah = selesai.get(kunci(u, k.id))?.size ?? 0
  const { materi, ...sisa } = k
  return { ...sisa, jumlahMateri: materi.length, materiSelesai: jumlah, persen: Math.round((jumlah / materi.length) * 100) }
}

function keDetail(k: KursusRow, u: User): KursusDetail {
  const s = selesai.get(kunci(u, k.id))
  return {
    ...keRingkas(k, u),
    materi: k.materi.map((x) => ({ ...x, selesai: !!s?.has(x.id) })),
    sertifikat: sertifikat.get(kunci(u, k.id)) ?? null,
  }
}

export const pembelajaranHandlers = [
  http.get('/api/kursus', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(250)
    const hasil: DaftarKursus = {
      items: kursus.map((k) => keRingkas(k, user)),
      sertifikat: kursus.flatMap((k) => sertifikat.get(kunci(user, k.id)) ?? []),
    }
    return HttpResponse.json(hasil)
  }),

  http.get('/api/kursus/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(200)
    const k = kursus.find((x) => x.id === Number(params.id))
    return k ? HttpResponse.json(keDetail(k, user)) : notFound('Kursus tidak ditemukan.')
  }),

  // Idempoten: menandai ulang materi yang sudah selesai tidak mengubah apa pun.
  http.put('/api/kursus/:id/materi/:materi/selesai', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(250)
    const k = kursus.find((x) => x.id === Number(params.id))
    if (!k || !k.materi.some((x) => x.id === Number(params.materi))) return notFound('Materi tidak ditemukan.')
    const kk = kunci(user, k.id)
    const s = selesai.get(kk) ?? new Set<number>()
    s.add(Number(params.materi))
    selesai.set(kk, s)
    if (s.size === k.materi.length && k.adaSertifikat && !sertifikat.has(kk)) {
      sertifikat.set(kk, { nomor: `SPBE/${new Date().getFullYear()}/KRS-${k.id}/${String(++nomorSeq).padStart(4, '0')}`, kursus: k.judul, diterbitkanPada: new Date().toISOString() })
      kirimNotifikasi([user.id], { kategori: 'pembelajaran', judul: 'Kursus selesai', pesan: `Bukti penyelesaian ${k.judul} telah terbit.`, urlTujuan: `/pembelajaran/${k.id}` })
    }
    return HttpResponse.json(keDetail(k, user))
  }),
]
