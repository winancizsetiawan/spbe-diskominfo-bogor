import { delay, http, HttpResponse } from 'msw'
import {
  BATAS_TINDAKAN,
  TINDAKAN_INFO,
  type HitunganModerasi,
  type ItemModerasi,
  type LaporanItem,
  type TargetTipe,
  type TabModerasi,
  type Tindakan,
} from '@/features/moderasi/types'
import { balasan, KATEGORI, laporan, threads, type BalasanRow, type ThreadRow } from '../db'
import { catatAktivitas } from '../dbAktivitas'
import { idUserDariNama, kirimNotifikasi } from '../dbNotifikasi'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 5

const forbidden = () => HttpResponse.json({ message: 'Hanya Super Admin yang dapat memoderasi.' }, { status: 403 })

function laporanUntuk(tipe: TargetTipe, id: number): LaporanItem[] {
  return laporan
    .filter((l) => l.targetTipe === tipe && l.targetId === id)
    .map(({ id: laporanId, pelapor, alasan, dibuatPada, status }) => ({ id: laporanId, pelapor, alasan, dibuatPada, status }))
    // Laporan belum ditinjau lebih dulu, lalu yang terbaru.
    .sort((a, b) => Number(b.status === 'baru') - Number(a.status === 'baru') || b.dibuatPada.localeCompare(a.dibuatPada))
}

function kategoriNama(t: ThreadRow) {
  return KATEGORI.find((k) => k.id === t.idKategori)?.nama ?? '—'
}

function itemThread(t: ThreadRow): ItemModerasi {
  const daftar = laporanUntuk('thread', t.id)
  return {
    targetTipe: 'thread',
    targetId: t.id,
    threadId: t.id,
    judulThread: t.judul,
    kategori: kategoriNama(t),
    konten: t.konten,
    penulis: t.penulis,
    dibuatPada: t.dibuatPada,
    status: t.status,
    laporan: daftar,
    laporanBaru: daftar.filter((l) => l.status === 'baru').length,
  }
}

function itemBalasan(b: BalasanRow): ItemModerasi {
  const t = threads.find((x) => x.id === b.threadId)!
  const daftar = laporanUntuk('balasan', b.id)
  return {
    targetTipe: 'balasan',
    targetId: b.id,
    threadId: t.id,
    judulThread: t.judul,
    kategori: kategoriNama(t),
    konten: b.konten,
    penulis: b.penulis,
    dibuatPada: b.dibuatPada,
    status: b.tersembunyi ? 'tersembunyi' : 'aktif',
    laporan: daftar,
    laporanBaru: daftar.filter((l) => l.status === 'baru').length,
  }
}

/** Semua thread, ditambah balasan yang pernah dilaporkan. */
function semuaItem(): ItemModerasi[] {
  const adaLaporan = (b: BalasanRow) => laporan.some((l) => l.targetTipe === 'balasan' && l.targetId === b.id)
  return [...threads.map(itemThread), ...balasan.filter(adaLaporan).map(itemBalasan)]
}

const masukTab = (i: ItemModerasi, tab: TabModerasi) =>
  tab === 'semua' || (tab === 'dilaporkan' ? i.laporanBaru > 0 : i.laporan.length > 0 && i.laporanBaru === 0)

const cariTarget = (tipe: TargetTipe, id: number) =>
  tipe === 'thread' ? threads.find((t) => t.id === id) : balasan.find((b) => b.id === id)

export const moderasiHandlers = [
  http.get('/api/moderasi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const tabParam = url.searchParams.get('tab')
    const tab: TabModerasi = tabParam === 'semua' || tabParam === 'selesai' ? tabParam : 'dilaporkan'

    const semua = semuaItem()
    const hitungan: HitunganModerasi = {
      semua: semua.length,
      dilaporkan: semua.filter((i) => masukTab(i, 'dilaporkan')).length,
      selesai: semua.filter((i) => masukTab(i, 'selesai')).length,
    }

    const terlama = (i: ItemModerasi) => i.laporan.filter((l) => l.status === 'baru').map((l) => l.dibuatPada).sort()[0] ?? ''
    const cocok = semua
      .filter((i) => masukTab(i, tab))
      .filter((i) => !q || i.judulThread.toLowerCase().includes(q) || i.penulis.nama.toLowerCase().includes(q) || i.konten.toLowerCase().includes(q))
      // Antrean kerja: laporan tertua dulu; lainnya: terbaru dulu.
      .sort((a, b) => (tab === 'dilaporkan' ? terlama(a).localeCompare(terlama(b)) : b.dibuatPada.localeCompare(a.dibuatPada)))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      hitungan,
    })
  }),

  // Sequence Diagram 5: abaikan, kunci (hanya thread), atau sembunyikan.
  http.post('/api/moderasi/tindakan', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(400)
    const body = (await request.json()) as { targetTipe?: TargetTipe; targetId?: number; tindakan?: Tindakan; alasan?: string }
    const { targetTipe, targetId, tindakan } = body
    if ((targetTipe !== 'thread' && targetTipe !== 'balasan') || !targetId) return invalid({ targetTipe: 'Target tidak valid.' })
    if (!tindakan || !(tindakan in TINDAKAN_INFO)) return invalid({ tindakan: 'Tindakan tidak valid.' })
    if (tindakan === 'kunci' && targetTipe !== 'thread') return invalid({ tindakan: 'Hanya thread yang dapat dikunci.' })

    const target = cariTarget(targetTipe, targetId)
    if (!target) return notFound('Konten tidak ditemukan.')

    const alasan = (body.alasan ?? '').trim()
    if (TINDAKAN_INFO[tindakan].wajibAlasan && (alasan.length < BATAS_TINDAKAN.alasanMin || alasan.length > BATAS_TINDAKAN.alasanMax))
      return invalid({ alasan: `Alasan harus ${BATAS_TINDAKAN.alasanMin}–${BATAS_TINDAKAN.alasanMax} karakter.` })

    const terbuka = laporan.filter((l) => l.targetTipe === targetTipe && l.targetId === targetId && l.status === 'baru')
    const thread = targetTipe === 'thread' ? (target as ThreadRow) : null
    const tersembunyi = thread ? thread.status === 'tersembunyi' : !!(target as BalasanRow).tersembunyi

    // Konflik: item sudah ditindak moderator lain.
    if (tindakan === 'abaikan' && terbuka.length === 0) return conflict('Tidak ada laporan yang menunggu untuk item ini.')
    if (tindakan === 'kunci' && thread?.status !== 'aktif') return conflict('Thread ini sudah dikunci atau disembunyikan.')
    if (tindakan === 'sembunyikan' && tersembunyi) return conflict('Konten ini sudah disembunyikan.')

    if (tindakan === 'kunci') thread!.status = 'terkunci'
    if (tindakan === 'sembunyikan') {
      if (thread) thread.status = 'tersembunyi'
      else (target as BalasanRow).tersembunyi = true
    }
    for (const l of terbuka) l.status = tindakan === 'abaikan' ? 'ditolak' : 'ditindak'
    catatAktivitas(user.id, 'moderasi', `${TINDAKAN_INFO[tindakan].judul} ${targetTipe === 'thread' ? 'thread' : 'balasan'}${thread ? `: ${thread.judul}` : ''}`)

    // Pembuat konten diberi tahu beserta alasan moderator (kunci dan sembunyikan).
    if (tindakan !== 'abaikan') {
      const penulis = thread ? thread.penulis : (target as BalasanRow).penulis
      const judul = thread ? thread.judul : (threads.find((t) => t.id === (target as BalasanRow).threadId)?.judul ?? 'thread')
      kirimNotifikasi([idUserDariNama(penulis.nama)], {
        kategori: 'forum',
        judul: tindakan === 'kunci' ? 'Thread Anda dikunci moderator' : 'Konten Anda disembunyikan moderator',
        pesan: `${judul}. Alasan: ${alasan}`,
        urlTujuan: tindakan === 'kunci' ? `/forum/${thread!.id}` : '/forum',
      })
    }

    return HttpResponse.json(thread ? itemThread(thread) : itemBalasan(target as BalasanRow))
  }),
]
