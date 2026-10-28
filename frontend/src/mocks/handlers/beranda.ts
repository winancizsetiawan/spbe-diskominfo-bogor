import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import type {
  AktivitasHarian,
  BerandaAdminOpd,
  BerandaInternal,
  BerandaPublik,
  BerandaSuperAdmin,
  PembaruanMingguan,
} from '@/features/beranda/types'
import type { KategoriProses } from '@/features/flowchart/types'
import { hitungKesesuaian, statusRaaDari } from '@/features/katalog/types'
import { aktivitas } from '../dbAktivitas'
import { balasan, laporan, threads } from '../db'
import { dokumen } from '../dbDokumen'
import { flowchart } from '../dbFlowchart'
import { aplikasi } from '../dbKatalog'
import { notifikasi } from '../dbNotifikasi'
import { INSTANSI_SEMUA, pengguna } from '../dbPengguna'
import { pengajuan } from '../dbValidasi'
import { currentUser, unauthorized } from '../http'
import { keAplikasi } from './katalog'
import { ringkas } from './forum'

const HARI = 86_400_000

const persen = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const hariIso = (waktu: string | number) => new Date(waktu).toISOString().slice(0, 10)

function notifikasiTerbaru(user: User) {
  const milik = notifikasi.filter((n) => n.idUser === user.id)
  return {
    notifikasi: [...milik].sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada)).slice(0, 3).map(({ idUser: _id, ...n }) => n),
    belumDibaca: milik.filter((n) => !n.sudahDibaca).length,
  }
}

function berandaInternal(user: User): BerandaInternal {
  const populer = (t: (typeof threads)[number]) => balasan.filter((b) => b.threadId === t.id && !b.tersembunyi).length * 10 + t.dilihat / 20
  return {
    tipe: 'internal',
    dokumenTerbaru: dokumen
      .filter((d) => d.status === 'berlaku' || d.status === 'review')
      .sort((a, b) => b.tanggalRilis.localeCompare(a.tanggalRilis))
      .slice(0, 4),
    threadPopuler: threads
      .filter((t) => t.status !== 'tersembunyi')
      .sort((a, b) => populer(b) - populer(a))
      .slice(0, 3)
      .map(ringkas),
    ...notifikasiTerbaru(user),
  }
}

function berandaAdminOpd(user: User): BerandaAdminOpd {
  const idInstansi = user.instansi.id
  const apps = aplikasi.filter((a) => a.idInstansi === idInstansi)
  const alur = flowchart.filter((f) => f.idInstansi === idInstansi)
  const status = apps.map((a) => statusRaaDari(hitungKesesuaian(a)))
  const sekarang = Date.now()

  // Delapan minggu terakhir; setiap data dihitung pada minggu pembaruan terakhirnya.
  const tren: PembaruanMingguan[] = Array.from({ length: 8 }, (_, k) => {
    const mulai = sekarang - (8 - k) * 7 * HARI
    const akhir = mulai + 7 * HARI
    const dalam = (waktu: string) => new Date(waktu).getTime() >= mulai && new Date(waktu).getTime() < akhir
    return {
      minggu: new Date(mulai).toISOString(),
      aplikasiDiperbarui: apps.filter((a) => dalam(a.diperbaruiPada)).length,
      flowchartDiperbarui: alur.filter((f) => dalam(f.diperbaruiPada)).length,
    }
  })

  const kategori: KategoriProses[] = ['utama', 'pendukung', 'manajemen']
  return {
    tipe: 'admin_opd',
    instansi: user.instansi,
    ringkasan: {
      totalAplikasi: apps.length,
      sudahDiklasifikasi: apps.filter((a) => a.raa.level1).length,
      flowchartDipublikasikan: alur.filter((f) => f.status === 'disetujui').length,
      totalFlowchart: alur.length,
      kepatuhanRaa: persen(status.filter((s) => s === 'sesuai').length, apps.length),
    },
    statusRaa: {
      sesuai: status.filter((s) => s === 'sesuai').length,
      perluPenyesuaian: status.filter((s) => s === 'perlu_penyesuaian').length,
      belum: status.filter((s) => s === 'belum').length,
    },
    tren,
    aplikasiTerbaru: [...apps].sort((a, b) => b.diperbaruiPada.localeCompare(a.diperbaruiPada)).slice(0, 4).map(keAplikasi),
    progresFlowchart: kategori.map((k) => ({
      kategori: k,
      dipublikasikan: alur.filter((f) => f.kategori === k && f.status === 'disetujui').length,
      total: alur.filter((f) => f.kategori === k).length,
    })),
    ...notifikasiTerbaru(user),
  }
}

function berandaSuperAdmin(user: User): BerandaSuperAdmin {
  const sekarang = Date.now()
  // Tiga puluh hari terakhir, dihitung dari catatan nyata di tiap modul.
  const hari: AktivitasHarian[] = Array.from({ length: 30 }, (_, i) => ({
    tanggal: hariIso(sekarang - (29 - i) * HARI),
    login: 0,
    validasi: 0,
    unggahan: 0,
    forum: 0,
  }))
  const tambah = (waktu: string | null, kunci: keyof Omit<AktivitasHarian, 'tanggal'>) => {
    if (!waktu) return
    const baris = hari.find((h) => h.tanggal === hariIso(waktu))
    if (baris) baris[kunci] += 1
  }
  aktivitas.filter((a) => a.aksi === 'login' && a.hasil === 'berhasil').forEach((a) => tambah(a.waktu, 'login'))
  pengajuan.forEach((p) => {
    tambah(p.tanggalPengajuan, 'validasi')
    tambah(p.tanggalPutusan, 'validasi')
  })
  dokumen.forEach((d) => tambah(d.tanggalRilis, 'unggahan'))
  threads.forEach((t) => tambah(t.dibuatPada, 'forum'))
  balasan.forEach((b) => tambah(b.dibuatPada, 'forum'))

  const hitung = (s: string) => pengajuan.filter((p) => p.status === s).length
  return {
    tipe: 'super_admin',
    ringkasan: {
      totalPengguna: pengguna.length,
      instansiTerdaftar: INSTANSI_SEMUA.length,
      // Dihitung tiap permintaan: status dokumen berubah lewat Repositori.
      totalDokumen: dokumen.filter((d) => d.status === 'berlaku' || d.status === 'review').length,
      menungguValidasi: hitung('menunggu'),
      threadForum: threads.filter((t) => t.status !== 'tersembunyi').length,
      laporanBaru: laporan.filter((l) => l.status === 'baru').length,
    },
    statusValidasi: {
      menunggu: hitung('menunggu'),
      disetujui: hitung('disetujui'),
      perlu_revisi: hitung('perlu_revisi'),
      ditolak: hitung('ditolak'),
    },
    aktivitas: hari,
    ...notifikasiTerbaru(user),
  }
}

export const berandaHandlers = [
  // Publik: hanya angka agregat dan dokumen berstatus publik.
  http.get('/api/beranda/publik', async () => {
    await delay(250)
    const publik = dokumen.filter((d) => d.status === 'berlaku' && d.visibilitas === 'publik')
    const hasil: BerandaPublik = {
      dokumenPublik: publik.length,
      sopBerlaku: dokumen.filter((d) => d.jenis === 'sop' && d.status === 'berlaku').length,
      instansi: INSTANSI_SEMUA.length,
      diskusi: threads.filter((t) => t.status === 'aktif' || t.status === 'terkunci').length,
      dokumenPopuler: [...publik].sort((a, b) => b.jumlahUnduhan - a.jumlahUnduhan).slice(0, 3),
    }
    return HttpResponse.json(hasil)
  }),

  http.get('/api/beranda', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(350)
    if (user.role === 'super_admin') return HttpResponse.json(berandaSuperAdmin(user))
    if (user.role === 'admin_opd') return HttpResponse.json(berandaAdminOpd(user))
    return HttpResponse.json(berandaInternal(user))
  }),
]
