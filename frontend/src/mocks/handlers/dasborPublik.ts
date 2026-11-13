import { delay, http, HttpResponse } from 'msw'
import type { DasborPublik } from '@/features/dasbor-publik/types'
import { currentUser, unauthorized } from '../http'

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
]
