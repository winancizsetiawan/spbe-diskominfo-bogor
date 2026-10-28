import { delay, http, HttpResponse } from 'msw'
import { ROLE_LABEL, type Role } from '@/auth/types'
import {
  BATAS_PENGGUNA,
  instansiBolehUntuk,
  POLA_EMAIL,
  URUTAN_ROLE,
  type DaftarPengguna,
  type FilterRole,
  type Pengguna,
  type UbahPenggunaInput,
  type UndangInput,
} from '@/features/pengguna/types'
import { catatAktivitas } from '../dbAktivitas'
import { kirimNotifikasi } from '../dbNotifikasi'
import { INSTANSI_SEMUA, nextPenggunaId, pengguna, sinkronkanAkunDemo, type PenggunaRow } from '../dbPengguna'
import { conflict, currentUser, invalid, notFound, unauthorized } from '../http'

const PER_PAGE = 8

const forbidden = () => HttpResponse.json({ message: 'Hanya Super Admin yang dapat mengelola pengguna.' }, { status: 403 })

const cariInstansi = (id: unknown) => INSTANSI_SEMUA.find((i) => i.id === id)
const roleValid = (r: unknown): r is Role => URUTAN_ROLE.includes(r as Role)

function kePengguna(row: PenggunaRow): Pengguna {
  const { idInstansi, ...sisa } = row
  return { ...sisa, instansi: cariInstansi(idInstansi)! }
}

export const penggunaHandlers = [
  http.get('/api/pengguna/instansi', ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    return HttpResponse.json(INSTANSI_SEMUA)
  }),

  http.get('/api/pengguna', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const roleParam = url.searchParams.get('role')
    const role: FilterRole = roleValid(roleParam) ? roleParam : 'semua'

    const hitungan = Object.fromEntries([
      ['semua', pengguna.length],
      ...URUTAN_ROLE.map((r) => [r, pengguna.filter((p) => p.role === r).length]),
    ]) as DaftarPengguna['hitungan']

    const cocok = pengguna
      .filter((p) => role === 'semua' || p.role === role)
      .map(kePengguna)
      .filter((p) => !q || p.nama.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.instansi.nama.toLowerCase().includes(q))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))

    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
      hitungan,
    })
  }),

  // Undangan: akun dibuat di Keycloak (Admin API) dengan aksi wajib ganti sandi dan verifikasi email (K2).
  http.post('/api/pengguna', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(450)
    const body = (await request.json()) as Partial<UndangInput>
    const errors: Record<string, string> = {}
    const nama = (body.nama ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    if (nama.length < BATAS_PENGGUNA.namaMin || nama.length > BATAS_PENGGUNA.namaMax)
      errors.nama = `Nama harus ${BATAS_PENGGUNA.namaMin}–${BATAS_PENGGUNA.namaMax} karakter.`
    if (!POLA_EMAIL.test(email)) errors.email = 'Format email tidak valid.'
    else if (pengguna.some((p) => p.email.toLowerCase() === email)) errors.email = 'Email sudah terdaftar.'
    if (!roleValid(body.role)) errors.role = 'Peran tidak valid.'
    const instansi = cariInstansi(body.idInstansi)
    if (!instansi) errors.idInstansi = 'Pilih instansi.'
    else if (roleValid(body.role) && !instansiBolehUntuk(body.role, instansi)) errors.idInstansi = 'Admin OPD harus berasal dari OPD.'
    if (Object.keys(errors).length > 0) return invalid(errors)

    const row: PenggunaRow = {
      id: nextPenggunaId(),
      nama,
      email,
      role: body.role!,
      statusAkun: 'diundang',
      idInstansi: instansi!.id,
      loginTerakhir: null,
    }
    pengguna.push(row)
    catatAktivitas(user.id, 'kelola_pengguna', `Mengundang ${nama} sebagai ${ROLE_LABEL[row.role]}`)
    return HttpResponse.json(kePengguna(row), { status: 201 })
  }),

  http.patch('/api/pengguna/:id', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(400)
    const row = pengguna.find((p) => p.id === Number(params.id))
    if (!row) return notFound('Pengguna tidak ditemukan.')
    // Super Admin tidak boleh mengubah akunnya sendiri: menjaga selalu ada Super Admin aktif.
    if (row.id === user.id) return conflict('Anda tidak dapat mengubah akun Anda sendiri.')

    const body = (await request.json()) as UbahPenggunaInput
    if (body.role === undefined && body.idInstansi === undefined && body.statusAkun === undefined)
      return invalid({ role: 'Tidak ada perubahan.' })

    const errors: Record<string, string> = {}
    const roleBaru = body.role ?? row.role
    if (body.role !== undefined && !roleValid(body.role)) errors.role = 'Peran tidak valid.'
    const instansiBaru = cariInstansi(body.idInstansi ?? row.idInstansi)
    if (!instansiBaru) errors.idInstansi = 'Instansi tidak valid.'
    else if (roleValid(roleBaru) && !instansiBolehUntuk(roleBaru, instansiBaru)) errors.idInstansi = 'Admin OPD harus berasal dari OPD.'
    if (body.statusAkun !== undefined && body.statusAkun !== 'aktif' && body.statusAkun !== 'nonaktif') errors.statusAkun = 'Status tidak valid.'
    if (Object.keys(errors).length > 0) return invalid(errors)

    // State machine status: aktif/diundang → nonaktif; nonaktif → aktif (atau diundang bila belum pernah masuk).
    if (body.statusAkun === 'nonaktif' && row.statusAkun === 'nonaktif') return conflict('Akun sudah nonaktif.')
    if (body.statusAkun === 'aktif' && row.statusAkun !== 'nonaktif') return conflict('Akun tidak sedang nonaktif.')

    const roleBerubah = body.role !== undefined && body.role !== row.role
    const instansiBerubah = body.idInstansi !== undefined && body.idInstansi !== row.idInstansi
    if (roleBerubah) row.role = body.role!
    if (instansiBerubah) row.idInstansi = body.idInstansi!
    if (body.statusAkun === 'nonaktif') row.statusAkun = 'nonaktif'
    if (body.statusAkun === 'aktif') row.statusAkun = row.loginTerakhir ? 'aktif' : 'diundang'
    sinkronkanAkunDemo(row)

    if (roleBerubah || instansiBerubah) {
      kirimNotifikasi([row.id], {
        kategori: 'sistem',
        judul: 'Peran akun Anda diubah',
        pesan: `Peran Anda kini ${ROLE_LABEL[row.role]} di ${cariInstansi(row.idInstansi)!.nama}.`,
        urlTujuan: '/profil',
      })
      catatAktivitas(user.id, 'kelola_pengguna', `Mengubah ${row.nama} menjadi ${ROLE_LABEL[row.role]}, ${cariInstansi(row.idInstansi)!.nama}`)
    }
    if (body.statusAkun) {
      catatAktivitas(user.id, 'kelola_pengguna', `${body.statusAkun === 'nonaktif' ? 'Menonaktifkan' : 'Mengaktifkan kembali'} akun ${row.nama}`)
    }
    return HttpResponse.json(kePengguna(row))
  }),

  http.post('/api/pengguna/:id/undang-ulang', async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden()
    await delay(300)
    const row = pengguna.find((p) => p.id === Number(params.id))
    if (!row) return notFound('Pengguna tidak ditemukan.')
    if (row.statusAkun !== 'diundang') return conflict('Hanya pengguna berstatus Diundang yang dapat diundang ulang.')
    catatAktivitas(user.id, 'kelola_pengguna', `Mengirim ulang undangan ke ${row.email}`)
    return new HttpResponse(null, { status: 204 })
  }),
]
