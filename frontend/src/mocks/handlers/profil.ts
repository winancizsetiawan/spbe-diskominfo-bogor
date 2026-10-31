import { delay, http, HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import { normalisasiTelepon, POLA_TELEPON, type ProfilSaya } from '@/features/profil/types'
import { aktivitas, catatAktivitas } from '../dbAktivitas'
import { balasan, threads } from '../db'
import { profil } from '../dbProfil'
import { currentUser, invalid, unauthorized } from '../http'

const PER_PAGE = 8

function keProfil(user: User): ProfilSaya {
  const p = profil[user.id]
  return {
    nama: user.nama,
    email: user.email,
    nip: p.nip,
    jabatan: p.jabatan,
    golongan: p.golongan,
    satkerInduk: p.satkerInduk,
    noTelepon: p.noTelepon,
    instansi: user.instansi,
    role: user.role,
    statistik: {
      dokumenDiunduh: aktivitas.filter((a) => a.idUser === user.id && a.aksi === 'unduh').length,
      diskusiForum:
        threads.filter((t) => t.penulis.nama === user.nama).length + balasan.filter((b) => b.penulis.nama === user.nama).length,
    },
  }
}

export const profilHandlers = [
  http.get('/api/profil', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(250)
    return HttpResponse.json(keProfil(user))
  }),

  // Hanya nomor telepon yang dapat diubah; nama, NIP, instansi, dan email berasal dari SSO.
  http.put('/api/profil', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(350)
    const { noTelepon } = (await request.json()) as { noTelepon?: string | null }
    const bersih = noTelepon ? normalisasiTelepon(noTelepon) : ''
    if (bersih && !POLA_TELEPON.test(bersih)) return invalid({ noTelepon: 'Gunakan nomor seluler Indonesia, mis. 081234567890.' })
    profil[user.id].noTelepon = bersih || null
    catatAktivitas(user.id, 'ubah_profil', bersih ? 'Mengubah nomor telepon' : 'Menghapus nomor telepon')
    return HttpResponse.json(keProfil(user))
  }),

  http.get('/api/profil/preferensi', ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    return HttpResponse.json({ kanalEmail: profil[user.id].kanalEmail })
  }),

  http.put('/api/profil/preferensi', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(200)
    const { kanalEmail } = (await request.json()) as { kanalEmail?: unknown }
    if (typeof kanalEmail !== 'boolean') return invalid({ kanalEmail: 'Nilai harus benar atau salah.' })
    profil[user.id].kanalEmail = kanalEmail
    catatAktivitas(user.id, 'ubah_preferensi', `Notifikasi email ${kanalEmail ? 'diaktifkan' : 'dimatikan'}`)
    return HttpResponse.json({ kanalEmail })
  }),

  // Riwayat aktivitas milik sendiri; Super Admin memakai halaman Audit Trail untuk semua pengguna.
  http.get('/api/profil/aktivitas', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    await delay(250)
    const page = Math.max(1, Number(new URL(request.url).searchParams.get('page')) || 1)
    const milik = aktivitas.filter((a) => a.idUser === user.id).sort((a, b) => b.waktu.localeCompare(a.waktu))
    return HttpResponse.json({
      items: milik.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(({ idUser: _idUser, ...a }) => a),
      page,
      totalPages: Math.max(1, Math.ceil(milik.length / PER_PAGE)),
      total: milik.length,
    })
  }),
]
