import { delay, http, HttpResponse } from 'msw'
import { BATAS_CARI, kataKunci, TIPE_LABEL, type DaftarCari, type FilterTipe, type HasilCari } from '@/features/cari/types'
import { JENIS_LABEL } from '@/features/dokumen/types'
import { threads, KATEGORI as KATEGORI_FORUM } from '../db'
import { dokumen } from '../dbDokumen'
import { flowchart } from '../dbFlowchart'
import { aplikasi, INSTANSI } from '../dbKatalog'
import { currentUser, invalid } from '../http'
import { artikel, bantuan } from './konten'
import { kursus } from './pembelajaran'

const PER_PAGE = 6

/** Penyederhanaan "makna" untuk mock: istilah yang berdekatan. Pada sistem sungguhan ini dikerjakan model embedding. */
const SINONIM: Record<string, string[]> = {
  backup: ['cadangan', 'pemulihan'],
  cadangan: ['backup', 'pemulihan'],
  keamanan: ['siber', 'bssn', 'iso'],
  siber: ['keamanan'],
  arsitektur: ['raa', 'domain'],
  aplikasi: ['sistem'],
  integrasi: ['splp', 'interoperabilitas'],
  data: ['informasi'],
  evaluasi: ['indeks', 'penilaian'],
  regulasi: ['peraturan', 'perpres', 'perwali'],
  peraturan: ['regulasi', 'perpres'],
}

const saklar = (kunci: string) => {
  try {
    return sessionStorage.getItem(kunci)
  } catch {
    return null
  }
}

function cuplik(teks: string, kata: string[]) {
  const rendah = teks.toLowerCase()
  const posisi = kata.map((k) => rendah.indexOf(k)).filter((i) => i >= 0)
  const mulai = Math.max(0, (posisi.length ? Math.min(...posisi) : 0) - 40)
  const potong = teks.slice(mulai, mulai + 180).trim()
  return `${mulai > 0 ? '…' : ''}${potong}${mulai + 180 < teks.length ? '…' : ''}`
}

interface Kandidat {
  tipe: HasilCari['tipe']
  id: number
  judul: string
  isi: string
  meta: string
  url: string
}

/** Skor kata kunci (FTS): semua kata harus muncul; judul bernilai lebih tinggi. */
function skorKeyword(c: Kandidat, kata: string[]) {
  const judul = c.judul.toLowerCase()
  const isi = c.isi.toLowerCase()
  if (!kata.every((k) => judul.includes(k) || isi.includes(k))) return 0
  return kata.reduce((s, k) => s + (judul.includes(k) ? 3 : 1), 0)
}

/** Skor "semantik": kata mana pun atau padanannya cukup, dengan bobot lebih kecil untuk padanan. */
function skorSemantik(c: Kandidat, kata: string[]) {
  const teks = `${c.judul} ${c.isi}`.toLowerCase()
  const judul = c.judul.toLowerCase()
  let s = 0
  for (const k of kata) {
    if (judul.includes(k)) s += 3
    else if (teks.includes(k)) s += 1.5
    for (const p of SINONIM[k] ?? []) if (teks.includes(p)) s += 0.75
  }
  return s
}

export const cariHandlers = [
  http.get('/api/cari', async ({ request }) => {
    const user = currentUser(request)
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    if (q.length < BATAS_CARI.min || q.length > BATAS_CARI.max)
      return invalid({ q: `Kata kunci harus ${BATAS_CARI.min}–${BATAS_CARI.max} karakter.` })
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const tipeParam = url.searchParams.get('tipe')
    const tipe: FilterTipe = tipeParam && tipeParam in TIPE_LABEL ? (tipeParam as FilterTipe) : 'semua'
    const fallback = saklar('spbe.mock.smartSearchDown') === '1'
    await delay(fallback ? 250 : 500)

    // Penyaringan hak akses dilakukan sebelum pemeringkatan: anonim hanya konten publik, forum khusus pengguna login.
    const kandidat: Kandidat[] = [
      ...dokumen
        .filter((d) => (user ? d.status === 'berlaku' || d.status === 'review' : d.status === 'berlaku' && d.visibilitas === 'publik'))
        .map<Kandidat>((d) => ({
          tipe: d.jenis === 'sop' ? 'sop' : 'dokumen',
          id: d.id,
          judul: d.judul,
          isi: d.deskripsi,
          meta: `${d.kategori?.nama ?? JENIS_LABEL[d.jenis]} · v${d.versi}`,
          url: `/dokumen/${d.id}`,
        })),
      ...(user
        ? threads
            .filter((t) => t.status !== 'tersembunyi')
            .map<Kandidat>((t) => ({
              tipe: 'forum',
              id: t.id,
              judul: t.judul,
              isi: t.konten,
              meta: `${KATEGORI_FORUM.find((k) => k.id === t.idKategori)?.nama ?? 'Forum'} · ${t.penulis.nama}`,
              url: `/forum/${t.id}`,
            }))
        : []),
      // Konten publik.
      ...artikel.map<Kandidat>((a) => ({
        tipe: 'berita',
        id: a.id,
        judul: a.judul,
        isi: `${a.ringkasan} ${a.konten}`,
        meta: `${a.jenis === 'berita' ? 'Berita' : 'Artikel'} · ${a.penulis}`,
        url: `/berita/${a.id}`,
      })),
      ...[...bantuan.faq.map((f) => ({ judul: f.pertanyaan, isi: f.jawaban })), ...bantuan.panduan.map((p) => ({ judul: p.judul, isi: p.isi }))].map<Kandidat>(
        (b, i) => ({ tipe: 'bantuan', id: i + 1, judul: b.judul, isi: b.isi, meta: 'Pusat bantuan', url: '/bantuan' }),
      ),
      // Konten internal: kursus untuk semua pengguna masuk; katalog hanya untuk pengelolanya, dibatasi ke instansi Admin OPD.
      ...(user
        ? kursus.map<Kandidat>((k) => ({ tipe: 'kursus', id: k.id, judul: k.judul, isi: k.deskripsi, meta: `${k.kategori} · ${k.durasiJam} jam`, url: `/pembelajaran/${k.id}` }))
        : []),
      ...(user?.role === 'super_admin' || user?.role === 'admin_opd'
        ? [
            ...aplikasi
              .filter((a) => user.role === 'super_admin' || a.idInstansi === user.instansi.id)
              .map<Kandidat>((a) => ({
                tipe: 'aplikasi',
                id: a.id,
                judul: a.nama,
                isi: `${a.deskripsi} ${a.kategori ?? ''}`,
                meta: `${INSTANSI.find((i) => i.id === a.idInstansi)?.nama ?? 'Instansi'} · ${a.kategori ?? 'Belum dikategorikan'}`,
                url: '/katalog/aplikasi',
              })),
            ...flowchart
              .filter((f) => user.role === 'super_admin' || f.idInstansi === user.instansi.id)
              .map<Kandidat>((f) => ({ tipe: 'flowchart', id: f.id, judul: f.nama, isi: `${f.deskripsi} ${f.pic}`, meta: `${f.kode} · v${f.versi}`, url: `/katalog/flowchart/${f.id}` })),
          ]
        : []),
    ]

    const kata = kataKunci(q)
    const skor = fallback ? skorKeyword : skorSemantik
    const bernilai = kandidat
      .map((c) => ({ c, s: kata.length ? skor(c, kata) : 0 }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.c.judul.localeCompare(b.c.judul, 'id'))

    const cocok = bernilai.filter((x) => tipe === 'semua' || x.c.tipe === tipe)
    const hitung = (t: FilterTipe) => bernilai.filter((x) => t === 'semua' || x.c.tipe === t).length
    const hasil: DaftarCari = {
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(({ c }) => ({
        tipe: c.tipe,
        id: c.id,
        judul: c.judul,
        cuplikan: cuplik(c.isi, kata),
        meta: c.meta,
        url: c.url,
      })),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      hitungan: Object.fromEntries((Object.keys(TIPE_LABEL) as FilterTipe[]).map((t) => [t, hitung(t)])) as DaftarCari['hitungan'],
      fallback,
    }
    return HttpResponse.json(hasil)
  }),
]
