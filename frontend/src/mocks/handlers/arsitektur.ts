import { delay, http, HttpResponse } from 'msw'
import type { ProbisArsitektur, RantaiArsitektur } from '@/features/flowchart/types'
import { currentUser, unauthorized } from '../http'

// Contoh kecil dari Excel matriks arsitektur untuk mode data contoh (tanpa BE).
const PROBIS: ProbisArsitektur[] = [
  { id: 'BKT-DAB.04.01.01.3', nama: 'Terwujudnya Keluarga Sehat', unit: 'Dinas Kesehatan', jenis: 'Probis Utama', statusBpmnAsIs: 'Belum', statusBpmnToBe: 'Belum' },
  { id: 'BKT-DAB.04.01.01.4', nama: 'Meningkatnya status kesehatan masyarakat', unit: 'Dinas Kesehatan', jenis: 'Sub Probis', statusBpmnAsIs: 'Belum', statusBpmnToBe: 'Belum' },
]

const RANTAI: Omit<RantaiArsitektur, 'prosesBisnis'> = {
  dasarData: 'kode',
  data: [
    { id: 'BKT-DAD.04.01.01.1', nama: 'Data Gizi' },
    { id: 'BKT-DAD.04.01.01.2', nama: 'Data Ibu dan Anak' },
    { id: 'BKT-DAD.04.01.01.4', nama: 'Data Layanan Kesehatan' },
  ],
  aplikasi: [
    { id: 'BKT-DAA.02.02.01.01.2', nama: 'E-PPBGM', data: ['BKT-DAD.04.01.01.1'], layanan: ['BKT-DAL.01.25.01.2'], infrastruktur: [] },
    { id: 'BKT-DAA.02.02.01.01.1', nama: 'E-Cohort (pencatatan kesehatan)', data: ['BKT-DAD.04.01.01.2'], layanan: ['BKT-DAL.01.25.01.4'], infrastruktur: [] },
    { id: 'BKT-DAA.01.01.01.02.1', nama: 'DIKAPER', data: ['BKT-DAD.04.01.01.4'], layanan: ['BKT-DAL.01.25.01.1'], infrastruktur: ['BGR-DAI 03.01.01.11'] },
  ],
  layanan: [
    { id: 'BKT-DAL.01.25.01.1', nama: 'Layanan Kesehatan', unit: 'Dinas Kesehatan' },
    { id: 'BKT-DAL.01.25.01.2', nama: 'Layanan Pelaporan Gizi', unit: 'Dinas Kesehatan' },
    { id: 'BKT-DAL.01.25.01.4', nama: 'Layanan Pelaporan Data KIA', unit: 'Dinas Kesehatan' },
  ],
  infrastruktur: [{ id: 'BGR-DAI 03.01.01.11', nama: 'Server VM Dikaper DINKES', kategori: 'Perangkat Keras Server' }],
}

export const arsitekturHandlers = [
  http.get('/api/arsitektur/proses-bisnis', async ({ request }) => {
    await delay(150)
    if (!currentUser(request)) return unauthorized()
    return HttpResponse.json({ items: PROBIS })
  }),
  http.get('/api/arsitektur/rantai', async ({ request }) => {
    await delay(150)
    if (!currentUser(request)) return unauthorized()
    const p = PROBIS.find((x) => x.id === new URL(request.url).searchParams.get('id'))
    if (!p) return HttpResponse.json({ message: 'Proses bisnis tidak ditemukan di data arsitektur.' }, { status: 404 })
    return HttpResponse.json({ prosesBisnis: p, ...RANTAI } satisfies RantaiArsitektur)
  }),
]
