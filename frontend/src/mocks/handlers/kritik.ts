import { delay, http, HttpResponse } from 'msw'
import { BATAS_KRITIK, type Kritik, type KritikInput } from '@/features/kritik/kritik'
import { POLA_EMAIL } from '@/features/pengguna/types'
import { currentUser, invalid, unauthorized } from '../http'

const kritik: Kritik[] = [
  { id: 1, nama: 'Warga Bogor', email: 'warga@example.com', pesan: 'Mohon tambahkan lebih banyak panduan video untuk pengguna baru.', dibuatPada: new Date(Date.now() - 3 * 86_400_000).toISOString() },
]

const teks = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export const kritikHandlers = [
  // Publik. Server memeriksa ulang dan menyaring; pada sistem sungguhan juga dibatasi laju per IP.
  http.post('/api/kritik', async ({ request }) => {
    await delay(350)
    const b = (await request.json()) as Partial<KritikInput>
    const input = { nama: teks(b.nama), email: teks(b.email), pesan: teks(b.pesan) }
    const errors: Record<string, string> = {}
    if (input.nama.length < BATAS_KRITIK.namaMin || input.nama.length > BATAS_KRITIK.namaMax) errors.nama = `Nama harus ${BATAS_KRITIK.namaMin}–${BATAS_KRITIK.namaMax} karakter.`
    if (!POLA_EMAIL.test(input.email)) errors.email = 'Format email tidak valid.'
    if (input.pesan.length < BATAS_KRITIK.pesanMin || input.pesan.length > BATAS_KRITIK.pesanMax) errors.pesan = `Pesan harus ${BATAS_KRITIK.pesanMin}–${BATAS_KRITIK.pesanMax} karakter.`
    if (Object.keys(errors).length > 0) return invalid(errors)
    kritik.push({ id: kritik.length + 1, ...input, dibuatPada: new Date().toISOString() })
    return new HttpResponse(null, { status: 201 })
  }),

  http.get('/api/kritik', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return HttpResponse.json({ message: 'Hanya Super Admin yang dapat membaca kritik dan saran.' }, { status: 403 })
    await delay(250)
    return HttpResponse.json([...kritik].sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada)))
  }),
]
