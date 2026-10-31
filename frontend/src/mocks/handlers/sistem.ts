import { delay, http, HttpResponse } from 'msw'
import { AKSI_LABEL, type AksiAktivitas } from '@/features/profil/types'
import {
  hariIni,
  kategoriAudit,
  validasiPeriode,
  type AuditLog,
  type DaftarAudit,
  type DaftarBackup,
  type DaftarPeriode,
  type FilterKategoriAudit,
  type HasilAudit,
  type PeriodeInput,
  type RiwayatBackup,
} from '@/features/sistem/types'
import { aktivitas, catatAktivitas } from '../dbAktivitas'
import { aplikasi, INSTANSI } from '../dbKatalog'
import { idUserPerRole, kirimNotifikasi } from '../dbNotifikasi'
import { pengguna } from '../dbPengguna'
import {
  backup,
  JADWAL_BACKUP,
  kePeriode,
  nextBackupId,
  nextPeriodeId,
  pangkasBackup,
  periode,
  RETENSI_BACKUP,
} from '../dbSistem'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 10

const forbidden = () => HttpResponse.json({ message: 'Hanya Super Admin yang dapat membuka halaman ini.' }, { status: 403 })

function saklar(kunci: string): string | null {
  try {
    return sessionStorage.getItem(kunci)
  } catch {
    return null
  }
}

function keAudit(a: (typeof aktivitas)[number]): AuditLog {
  const p = a.idUser === null ? undefined : pengguna.find((x) => x.id === a.idUser)
  return {
    id: a.id,
    waktu: a.waktu,
    pengguna: p ? { nama: p.nama, email: p.email, role: p.role } : null,
    kategori: kategoriAudit(a.aksi, a.hasil),
    aksi: a.aksi,
    hasil: a.hasil,
    deskripsi: a.deskripsi,
    ipAddress: a.ipAddress,
  }
}

const pakaiAksi = (v: string | null): v is AksiAktivitas => !!v && v in AKSI_LABEL

function ringkasanBackup(): DaftarBackup {
  const urut = [...backup].sort((a, b) => b.waktu.localeCompare(a.waktu))
  return {
    items: urut,
    jadwal: JADWAL_BACKUP,
    retensi: RETENSI_BACKUP,
    terakhirBerhasil: urut.find((b) => b.status === 'berhasil')?.waktu ?? null,
  }
}

export const sistemHandlers = [
  // ---- Audit Trail: hanya baca ----
  http.get('/api/audit', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const kategoriParam = url.searchParams.get('kategori')
    const kategori: FilterKategoriAudit = kategoriParam === 'aktivitas' || kategoriParam === 'keamanan' ? kategoriParam : 'semua'
    const aksiParam = url.searchParams.get('aksi')
    const hasilParam = url.searchParams.get('hasil')
    const hasil: HasilAudit | null = hasilParam === 'berhasil' || hasilParam === 'gagal' ? hasilParam : null
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const dari = url.searchParams.get('dari')
    const sampai = url.searchParams.get('sampai')

    const semua = aktivitas.map(keAudit)
    const cocokTanpaKategori = semua
      .filter((a) => !pakaiAksi(aksiParam) || a.aksi === aksiParam)
      .filter((a) => !hasil || a.hasil === hasil)
      .filter((a) => !dari || hariIni(new Date(a.waktu)) >= dari)
      .filter((a) => !sampai || hariIni(new Date(a.waktu)) <= sampai)
      .filter(
        (a) =>
          !q ||
          a.deskripsi.toLowerCase().includes(q) ||
          a.pengguna?.nama.toLowerCase().includes(q) ||
          a.pengguna?.email.toLowerCase().includes(q) ||
          a.ipAddress?.includes(q),
      )
    const cocok = cocokTanpaKategori
      .filter((a) => kategori === 'semua' || a.kategori === kategori)
      .sort((a, b) => b.waktu.localeCompare(a.waktu) || b.id - a.id)

    const hasilJson: DaftarAudit = {
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      hitungan: {
        semua: cocokTanpaKategori.length,
        aktivitas: cocokTanpaKategori.filter((a) => a.kategori === 'aktivitas').length,
        keamanan: cocokTanpaKategori.filter((a) => a.kategori === 'keamanan').length,
      },
    }
    return HttpResponse.json(hasilJson)
  }),

  // ---- Backup ----
  http.get('/api/backup', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(250)
    return HttpResponse.json(ringkasanBackup())
  }),

  // Backup manual berjalan di server; hasilnya diketahui lewat polling daftar.
  http.post('/api/backup', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    if (backup.some((b) => b.status === 'berjalan')) return conflict('Backup sedang berjalan. Tunggu hingga selesai.')

    const baris: RiwayatBackup = { id: nextBackupId(), tipe: 'manual', status: 'berjalan', ukuranMb: null, oleh: user.nama, waktu: new Date().toISOString(), pesanGagal: null }
    backup.push(baris)
    pangkasBackup()
    catatAktivitas(user.id, 'backup', 'Menjalankan backup manual')

    setTimeout(() => {
      const gagal = saklar('spbe.mock.backupGagal') === '1'
      const terakhir = [...backup].filter((b) => b.status === 'berhasil').sort((a, b) => b.waktu.localeCompare(a.waktu))[0]
      baris.status = gagal ? 'gagal' : 'berhasil'
      baris.ukuranMb = gagal ? null : Math.round(((terakhir?.ukuranMb ?? 800) + 1.5) * 10) / 10
      baris.pesanGagal = gagal ? 'Backup tidak dapat diselesaikan. Periksa kapasitas penyimpanan.' : null
      catatAktivitas(user.id, 'backup', gagal ? 'Backup manual gagal' : 'Backup manual selesai', gagal ? 'gagal' : 'berhasil')
      if (gagal) {
        kirimNotifikasi(idUserPerRole('super_admin'), {
          kategori: 'sistem',
          judul: 'Backup gagal',
          pesan: 'Backup manual tidak berhasil. Periksa riwayat backup.',
          urlTujuan: '/admin/backup',
        })
      }
    }, 3000)

    return HttpResponse.json(baris, { status: 201 })
  }),

  // ---- Periode Pembaruan Data ----
  http.get('/api/periode', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    const tertinggal = INSTANSI.map((i) => ({
      instansi: i.nama,
      jumlah: aplikasi.filter((a) => a.idInstansi === i.id && a.statusValidasi !== 'disetujui').length,
    }))
      .filter((t) => t.jumlah > 0)
      .sort((a, b) => b.jumlah - a.jumlah)
    const hasil: DaftarPeriode = { items: [...periode].sort((a, b) => b.tanggalMulai.localeCompare(a.tanggalMulai)).map(kePeriode), tertinggal }
    return HttpResponse.json(hasil)
  }),

  http.post('/api/periode', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(350)
    const body = (await request.json()) as Partial<PeriodeInput>
    const input: PeriodeInput = { nama: body.nama ?? '', tanggalMulai: body.tanggalMulai ?? '', tenggat: body.tenggat ?? '' }
    const errors = validasiPeriode(input, periode.map(kePeriode))
    if (Object.keys(errors).length > 0) return invalid(errors as Record<string, string>)
    const row = { id: nextPeriodeId(), nama: input.nama.trim(), tanggalMulai: input.tanggalMulai, tenggat: input.tenggat, dibuatOleh: user.nama }
    periode.push(row)
    catatAktivitas(user.id, 'periode', `Membuat periode pembaruan ${row.nama}`)
    return HttpResponse.json(kePeriode(row), { status: 201 })
  }),

  http.put('/api/periode/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(350)
    const row = periode.find((p) => p.id === Number(params.id))
    if (!row) return notFound('Periode tidak ditemukan.')
    if (kePeriode(row).status === 'selesai') return conflict('Periode yang sudah selesai tidak dapat diubah.')
    const body = (await request.json()) as Partial<PeriodeInput>
    const input: PeriodeInput = { nama: body.nama ?? '', tanggalMulai: body.tanggalMulai ?? '', tenggat: body.tenggat ?? '' }
    const errors = validasiPeriode(input, periode.filter((p) => p.id !== row.id).map(kePeriode))
    if (Object.keys(errors).length > 0) return invalid(errors as Record<string, string>)
    Object.assign(row, { nama: input.nama.trim(), tanggalMulai: input.tanggalMulai, tenggat: input.tenggat })
    catatAktivitas(user.id, 'periode', `Mengubah periode pembaruan ${row.nama}`)
    return HttpResponse.json(kePeriode(row))
  }),

  http.delete('/api/periode/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    const i = periode.findIndex((p) => p.id === Number(params.id))
    if (i < 0) return notFound('Periode tidak ditemukan.')
    if (kePeriode(periode[i]).status === 'selesai') return conflict('Periode yang sudah selesai tidak dapat dihapus.')
    const [hapus] = periode.splice(i, 1)
    catatAktivitas(user.id, 'periode', `Menghapus periode pembaruan ${hapus.nama}`)
    return new HttpResponse(null, { status: 204 })
  }),
]
