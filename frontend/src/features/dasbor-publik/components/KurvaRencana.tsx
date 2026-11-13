import { LineChart } from '@/components/charts/LineChart'
import { WARNA } from '@/components/charts/warna'
import type { DasborPublik } from '../types'

/** Kurva peta rencana: kegiatan yang direncanakan vs yang sudah atau sedang dilaksanakan, per tahun. */
export function KurvaRencana({ data }: { data: DasborPublik['petaRencana']['trenTahunan'] }) {
  return (
    <LineChart
      halus
      area
      label="Jumlah kegiatan peta rencana yang direncanakan dan yang sudah atau sedang dilaksanakan per tahun"
      data={data.map((t) => ({ label: t.tahun, direncanakan: t.direncanakan, terlaksana: t.terlaksana }))}
      series={[
        { kunci: 'direncanakan', label: 'Kegiatan direncanakan', warna: WARNA.brand },
        { kunci: 'terlaksana', label: 'Sudah atau sedang dilaksanakan', warna: WARNA.hijau, pola: '5 3' },
      ]}
    />
  )
}
