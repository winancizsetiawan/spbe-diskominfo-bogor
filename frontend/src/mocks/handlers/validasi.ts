import { delay, http, HttpResponse } from 'msw'
import { BISA_DIAJUKAN, type HasilAjukan } from '@/features/katalog/types'
import {
  BATAS_KEPUTUSAN,
  KEPUTUSAN_INFO,
  type Hitungan,
  type JenisData,
  type Keputusan,
  type Pengajuan,
  type PengajuanDetail,
  type StatusPengajuan,
} from '@/features/validasi/types'
import { aplikasi, INSTANSI } from '../dbKatalog'
import { flowchart } from '../dbFlowchart'
import { nextPengajuanId, pengajuan, type PengajuanRow } from '../dbValidasi'
import { USERS } from '../db'
import { catatAktivitas } from '../dbAktivitas'
import { idUserPerRole, kirimNotifikasi } from '../dbNotifikasi'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'
import { keFlowchart } from './flowchart'
import { keAplikasi } from './katalog'

const PER_PAGE = 6

const forbidden = (message: string) => HttpResponse.json({ message }, { status: 403 })

/** Objek yang divalidasi: aplikasi atau flowchart proses bisnis. */
function targetDari(p: PengajuanRow) {
  if (p.idProses) {
    const f = flowchart.find((x) => x.id === p.idProses)!
    return { id: f.id, nama: f.nama, idInstansi: f.idInstansi }
  }
  const a = aplikasi.find((x) => x.id === p.idAplikasi)!
  return { id: a.id, nama: a.nama, idInstansi: a.idInstansi }
}

function kePengajuan(p: PengajuanRow): Pengajuan {
  const t = targetDari(p)
  return {
    id: p.id,
    jenisData: p.jenisData,
    status: p.status,
    aplikasi: { id: t.id, nama: t.nama },
    instansi: INSTANSI.find((i) => i.id === t.idInstansi)!,
    pengaju: p.pengaju,
    tanggalPengajuan: p.tanggalPengajuan,
    tanggalPutusan: p.tanggalPutusan,
    catatan: p.catatan,
  }
}

function keDetail(p: PengajuanRow): PengajuanDetail {
  return {
    ...kePengajuan(p),
    data: p.idProses ? null : keAplikasi(aplikasi.find((a) => a.id === p.idAplikasi)!),
    proses: p.idProses ? keFlowchart(flowchart.find((f) => f.id === p.idProses)!) : null,
  }
}

const panjang = (v: unknown) => (typeof v === 'string' ? v.trim().length : 0)

export const validasiHandlers = [
  // Pengajuan oleh Admin OPD (Sequence Diagram 3): hanya data instansinya sendiri.
  // jenisData: aplikasi, raa (id aplikasi), atau proses (id flowchart).
  http.post('/api/validasi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin_opd') return forbidden('Hanya Admin OPD yang dapat mengajukan validasi.')
    await delay(500)
    const { jenisData = 'aplikasi', targetIds = [] } = (await request.json()) as {
      jenisData?: JenisData
      targetIds?: number[]
    }

    // Satu bentuk umum untuk aplikasi dan flowchart agar logika pengajuan tidak digandakan.
    const untukProses = jenisData === 'proses'
    const sumber = untukProses ? flowchart : aplikasi
    const target = targetIds.map((id) => sumber.find((r) => r.id === id))
    if (target.some((r) => !r || r.idInstansi !== user.instansi.id)) return forbidden('Data ini bukan milik instansi Anda.')

    const hasil: HasilAjukan = { berhasil: [], dilewati: [] }
    for (const row of target as (typeof flowchart)[number][] | (typeof aplikasi)[number][]) {
      const status = untukProses ? (row as (typeof flowchart)[number]).status : (row as (typeof aplikasi)[number]).statusValidasi
      if (BISA_DIAJUKAN.includes(status)) {
        const sekarang = new Date().toISOString()
        if (untukProses) (row as (typeof flowchart)[number]).status = 'menunggu'
        else (row as (typeof aplikasi)[number]).statusValidasi = 'menunggu'
        row.catatanValidasi = null
        row.diperbaruiPada = sekarang
        pengajuan.push({
          id: nextPengajuanId(),
          jenisData,
          status: 'menunggu',
          idAplikasi: untukProses ? null : row.id,
          idProses: untukProses ? row.id : null,
          pengaju: user.nama,
          tanggalPengajuan: sekarang,
          tanggalPutusan: null,
          catatan: null,
        })
        hasil.berhasil.push(row.id)
      } else {
        hasil.dilewati.push({ id: row.id, nama: row.nama, alasan: 'Status sudah berubah, tidak dapat diajukan.' })
      }
    }
    if (hasil.berhasil.length > 0) {
      catatAktivitas(user.id, 'validasi', `Mengajukan validasi ${hasil.berhasil.length} ${untukProses ? 'flowchart' : 'data aplikasi'}`)
      kirimNotifikasi(idUserPerRole('super_admin'), {
        kategori: 'sistem',
        judul: 'Pengajuan validasi baru',
        pesan: `${user.instansi.nama} mengajukan ${hasil.berhasil.length} ${untukProses ? 'flowchart' : 'data'} untuk divalidasi.`,
        urlTujuan: '/admin/validasi',
      })
    }
    return HttpResponse.json(hasil, { status: 201 })
  }),

  http.get('/api/validasi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden('Hanya Super Admin yang dapat memvalidasi.')
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const status = url.searchParams.get('status') as StatusPengajuan | null

    const semua = pengajuan.map(kePengajuan)
    const hitungan: Hitungan = {
      semua: semua.length,
      menunggu: semua.filter((p) => p.status === 'menunggu').length,
      disetujui: semua.filter((p) => p.status === 'disetujui').length,
      perlu_revisi: semua.filter((p) => p.status === 'perlu_revisi').length,
      ditolak: semua.filter((p) => p.status === 'ditolak').length,
    }

    // Antrean menunggu: terlama dulu (FIFO); riwayat: keputusan terbaru dulu.
    const cocok = semua
      .filter((p) => !status || p.status === status)
      .filter((p) => !q || p.aplikasi.nama.toLowerCase().includes(q) || p.instansi.nama.toLowerCase().includes(q))
      .sort((a, b) =>
        status === 'menunggu'
          ? a.tanggalPengajuan.localeCompare(b.tanggalPengajuan)
          : b.tanggalPengajuan.localeCompare(a.tanggalPengajuan),
      )

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      hitungan,
    })
  }),

  http.get('/api/validasi/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden('Hanya Super Admin yang dapat memvalidasi.')
    await delay(250)
    const p = pengajuan.find((x) => x.id === Number(params.id))
    if (!p) return notFound('Pengajuan tidak ditemukan.')
    return HttpResponse.json(keDetail(p))
  }),

  http.post('/api/validasi/:id/keputusan', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden('Hanya Super Admin yang dapat memvalidasi.')
    await delay(450)
    const p = pengajuan.find((x) => x.id === Number(params.id))
    if (!p) return notFound('Pengajuan tidak ditemukan.')
    // State machine: hanya pengajuan Menunggu yang dapat diputuskan (tidak boleh melompati langkah).
    if (p.status !== 'menunggu') return conflict('Pengajuan ini sudah diputuskan.')

    const body = (await request.json()) as { keputusan?: Keputusan; catatan?: string }
    if (!body.keputusan || !(body.keputusan in KEPUTUSAN_INFO)) return invalid({ keputusan: 'Keputusan tidak valid.' })
    const catatan = (body.catatan ?? '').trim()
    if (catatan.length > BATAS_KEPUTUSAN.catatanMax)
      return invalid({ catatan: `Catatan maksimal ${BATAS_KEPUTUSAN.catatanMax} karakter.` })
    if (KEPUTUSAN_INFO[body.keputusan].wajibCatatan && panjang(catatan) < BATAS_KEPUTUSAN.catatanMin)
      return invalid({ catatan: `Catatan minimal ${BATAS_KEPUTUSAN.catatanMin} karakter.` })

    const sekarang = new Date().toISOString()
    p.status = body.keputusan
    p.tanggalPutusan = sekarang
    p.catatan = catatan || null
    catatAktivitas(user.id, 'validasi', `Keputusan ${KEPUTUSAN_INFO[body.keputusan].label.toLowerCase()}: ${targetDari(p).nama}`)

    // Hasil keputusan tercermin di data yang dilihat Admin OPD.
    let urlTujuan = '/katalog/aplikasi'
    if (p.idProses) {
      const f = flowchart.find((x) => x.id === p.idProses)!
      f.status = body.keputusan
      f.catatanValidasi = body.keputusan === 'disetujui' ? null : catatan
      f.diperbaruiPada = sekarang
      urlTujuan = `/katalog/flowchart/${f.id}`
    } else {
      const app = aplikasi.find((a) => a.id === p.idAplikasi)!
      app.statusValidasi = body.keputusan
      app.catatanValidasi = body.keputusan === 'disetujui' ? null : catatan
      app.diperbaruiPada = sekarang
    }

    // Admin OPD pemilik data diberi tahu hasil keputusannya.
    const t = targetDari(p)
    const adminPemilik = Object.values(USERS).filter((u) => u.role === 'admin_opd' && u.instansi.id === t.idInstansi).map((u) => u.id)
    kirimNotifikasi(adminPemilik, {
      kategori: 'sistem',
      judul: `Validasi ${KEPUTUSAN_INFO[body.keputusan].label.toLowerCase()}: ${t.nama}`,
      pesan: catatan || (p.idProses ? 'Flowchart Anda telah dipublikasikan.' : 'Data Anda telah disetujui dan masuk basis data terpusat.'),
      urlTujuan,
    })

    return HttpResponse.json(keDetail(p))
  }),
]
