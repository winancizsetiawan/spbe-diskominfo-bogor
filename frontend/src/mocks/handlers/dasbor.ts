import { delay, http, HttpResponse } from 'msw'
import type { DasborInstansi, EmbedDasbor, IndikatorPerbandingan } from '@/features/dasbor/types'
import { hitungKesesuaian, statusRaaDari } from '@/features/katalog/types'
import { flowchart } from '../dbFlowchart'
import { aplikasi, INSTANSI } from '../dbKatalog'
import { conflict, currentUser, notFound, unauthorized } from '../http'

const forbidden = () => HttpResponse.json({ message: 'Peran Anda tidak memiliki akses ke dasbor ini.' }, { status: 403 })

const persen = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

/** Saklar uji dev: memungkinkan menguji penanganan Metabase mati dan URL embed yang cepat kedaluwarsa. */
function saklar(kunci: string): string | null {
  try {
    return sessionStorage.getItem(kunci)
  } catch {
    return null
  }
}

function indikator(idInstansi: number): IndikatorPerbandingan[] {
  const milik = aplikasi.filter((a) => a.idInstansi === idInstansi)
  const alurMilik = flowchart.filter((f) => f.idInstansi === idInstansi)
  const sesuai = (rows: typeof aplikasi) => rows.filter((a) => statusRaaDari(hitungKesesuaian(a)) === 'sesuai').length
  const terklasifikasi = (rows: typeof aplikasi) => rows.filter((a) => a.raa.level1).length
  const disetujui = (rows: typeof aplikasi) => rows.filter((a) => a.statusValidasi === 'disetujui').length
  const terbit = (rows: typeof flowchart) => rows.filter((f) => f.status === 'disetujui').length

  const satu = (kunci: IndikatorPerbandingan['kunci'], label: string, keterangan: string, pembilang: number, penyebut: number, kotaN: number, kotaD: number): IndikatorPerbandingan => ({
    kunci,
    label,
    keterangan,
    instansi: persen(pembilang, penyebut),
    kota: persen(kotaN, kotaD),
    pembilang,
    penyebut,
  })

  return [
    satu('kepatuhanRaa', 'Kepatuhan RAA', 'Aplikasi berstatus RAA Sesuai.', sesuai(milik), milik.length, sesuai(aplikasi), aplikasi.length),
    satu('klasifikasi', 'Aplikasi terklasifikasi', 'Aplikasi yang sudah memiliki klasifikasi RAA.', terklasifikasi(milik), milik.length, terklasifikasi(aplikasi), aplikasi.length),
    satu('tervalidasi', 'Data tervalidasi', 'Aplikasi yang sudah disetujui Super Admin.', disetujui(milik), milik.length, disetujui(aplikasi), aplikasi.length),
    satu('flowchart', 'Flowchart dipublikasikan', 'Diagram proses bisnis yang sudah dipublikasikan.', terbit(alurMilik), alurMilik.length, terbit(flowchart), flowchart.length),
  ]
}

export const dasborHandlers = [
  // Perbandingan native: Admin OPD hanya instansinya sendiri; Super Admin memilih lewat idInstansi.
  http.get('/api/dasbor/instansi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin_opd' && user.role !== 'super_admin') return forbidden()
    await delay(300)
    const param = Number(new URL(request.url).searchParams.get('idInstansi')) || null
    // Parameter diabaikan untuk Admin OPD: server menegakkan batas instansi, bukan klien.
    const id = user.role === 'admin_opd' ? user.instansi.id : (param ?? INSTANSI[0].id)
    const instansi = INSTANSI.find((i) => i.id === id)
    if (!instansi) return notFound('Instansi tidak ditemukan.')
    const hasil: DasborInstansi = { instansi, indikator: indikator(id) }
    return HttpResponse.json(hasil)
  }),

  // URL embed Metabase bertanda tangan. Di sini disimulasikan dengan halaman statis di /mock.
  http.get('/api/dasbor/embed', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const url = new URL(request.url)
    const jenis = url.searchParams.get('jenis')
    if (jenis !== 'instansi' && jenis !== 'analitik') return notFound('Jenis dasbor tidak dikenal.')
    if (jenis === 'instansi' && user.role !== 'admin_opd' && user.role !== 'super_admin') return forbidden()
    await delay(300)
    if (saklar('spbe.mock.metabaseDown') === '1') return HttpResponse.json({ message: 'Metabase tidak tersedia.' }, { status: 503 })

    let filter: string | null = null
    if (jenis === 'instansi') {
      const param = Number(url.searchParams.get('idInstansi')) || null
      const id = user.role === 'admin_opd' ? user.instansi.id : (param ?? INSTANSI[0].id)
      const instansi = INSTANSI.find((i) => i.id === id)
      if (!instansi) return conflict('Instansi tidak valid.')
      filter = instansi.nama
    }

    const ttl = Number(saklar('spbe.mock.embedTtlDetik')) || 600
    const query = new URLSearchParams({ jenis, token: crypto.randomUUID() })
    if (filter) query.set('instansi', filter)
    const hasil: EmbedDasbor = {
      url: `/mock/metabase-contoh.html?${query}`,
      kedaluwarsa: new Date(Date.now() + ttl * 1000).toISOString(),
      filterTerkunci: filter ? `instansi = ${filter}` : null,
    }
    return HttpResponse.json(hasil)
  }),
]
