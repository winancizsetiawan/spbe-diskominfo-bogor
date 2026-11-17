import { delay, http, HttpResponse } from 'msw'
import type { DasborPublik } from '@/features/dasbor-publik/types'
import type { StatusDataDasbor } from '@/features/sistem/types'
import { currentUser, unauthorized } from '../http'

const forbidden = (message: string) => HttpResponse.json({ message }, { status: 403 })

// Data nyata (lokal, tidak masuk git): dibuat scripts/excel_dasbor_publik.py dari matriks Excel arsitektur SPBE.
const berkas = import.meta.glob<DasborPublik>('../dataNyata/dasbor{Publik,Internal}.json', { eager: true, import: 'default' })
const publik = berkas['../dataNyata/dasborPublik.json']
const internal = berkas['../dataNyata/dasborInternal.json']

const belumAda = () =>
  HttpResponse.json(
    { message: 'Data dasbor belum tersedia. Jalankan scripts/excel_dasbor_publik.py dengan berkas matriks arsitektur.' },
    { status: 404 },
  )

export const dasborPublikHandlers = [
  // Publik: tanpa login. Batasan kolom sudah diterapkan saat Excel diolah.
  http.get('/api/dasbor/publik', async () => {
    await delay(300)
    return publik ? HttpResponse.json(publik) : belumAda()
  }),

  // Internal: semua role yang sudah masuk, tanpa batasan.
  http.get('/api/dasbor/analitik', async ({ request }) => {
    if (!currentUser(request)) return unauthorized()
    await delay(350)
    return internal ? HttpResponse.json(internal) : belumAda()
  }),

  // Halaman Data Dasbor (Super Admin). Mode mock hanya menampilkan status; Excel diolah oleh BE.
  http.get('/api/dasbor/data', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'super_admin') return forbidden('Hanya Super Admin yang dapat memperbarui data dasbor.')
    await delay(200)
    const status: StatusDataDasbor = {
      aktif: internal ? { meta: null, ringkasan: null, diubahPada: new Date().toISOString() } : null,
      riwayat: [],
    }
    return HttpResponse.json(status)
  }),
  http.post('/api/dasbor/data/pratinjau', async ({ request }) => {
    if (!currentUser(request)) return unauthorized()
    await delay(300)
    return HttpResponse.json(
      { message: 'Mode demo tidak dapat mengolah Excel. Jalankan portal dengan backend untuk memperbarui data dasbor.' },
      { status: 422 },
    )
  }),
]
