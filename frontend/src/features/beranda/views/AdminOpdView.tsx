import { BarChart3, FolderKanban, ListChecks, Workflow } from 'lucide-react'
import { Link } from 'react-router'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { WARNA } from '@/components/charts/warna'
import { StatCard } from '@/components/ui/StatCard'
import { Table, Td, Th } from '@/components/ui/Table'
import { KATEGORI_LABEL } from '@/features/flowchart/types'
import { StatusRaaBadge, StatusValidasiBadge } from '@/features/katalog/components/StatusBadge'
import { formatHariBulan, waktuRelatif } from '@/lib/format'
import { AksesCepat } from '../components/AksesCepat'
import { NotifikasiRingkas } from '../components/NotifikasiRingkas'
import { Panel } from '../components/Panel'
import type { BerandaAdminOpd } from '../types'

export function AdminOpdView({ data }: { data: BerandaAdminOpd }) {
  const { ringkasan: r } = data
  return (
    <div className="space-y-8">
      <section aria-label="Ringkasan instansi" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total aplikasi" value={r.totalAplikasi} />
        <StatCard label="Sudah diklasifikasi" value={r.sudahDiklasifikasi} hint={`dari ${r.totalAplikasi} aplikasi`} tone="success" />
        <StatCard label="Flowchart dipublikasikan" value={r.flowchartDipublikasikan} hint={`dari ${r.totalFlowchart} diagram`} />
        <StatCard label="Kepatuhan RAA" value={`${r.kepatuhanRaa}%`} hint="aplikasi berstatus Sesuai" tone={r.kepatuhanRaa >= 80 ? 'success' : r.kepatuhanRaa >= 50 ? 'warning' : 'danger'} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Pembaruan data 8 minggu terakhir" className="lg:col-span-2">
          <BarChart
            label="Jumlah aplikasi dan flowchart yang diperbarui per minggu"
            data={data.tren.map((t) => ({ label: formatHariBulan(t.minggu), aplikasi: t.aplikasiDiperbarui, flowchart: t.flowchartDiperbarui }))}
            series={[
              { kunci: 'aplikasi', label: 'Aplikasi diperbarui', warna: WARNA.brand },
              { kunci: 'flowchart', label: 'Flowchart diperbarui', warna: WARNA.kuning },
            ]}
          />
        </Panel>

        <Panel judul="Status RAA aplikasi">
          <DonutChart
            label="Sebaran status RAA aplikasi instansi"
            pusat="aplikasi"
            data={[
              { label: 'Sesuai', nilai: data.statusRaa.sesuai, warna: WARNA.hijau },
              { label: 'Perlu penyesuaian', nilai: data.statusRaa.perluPenyesuaian, warna: WARNA.kuning },
              { label: 'Belum sesuai', nilai: data.statusRaa.belum, warna: WARNA.merah },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Aplikasi terbaru diperbarui" tautan={{ to: '/katalog/aplikasi', label: 'Lihat semua' }} className="lg:col-span-2">
          {data.aplikasiTerbaru.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada aplikasi.</p>
          ) : (
            <Table caption="Aplikasi instansi yang terakhir diperbarui">
              <thead>
                <tr>
                  <Th>Aplikasi</Th>
                  <Th>Status RAA</Th>
                  <Th>Validasi</Th>
                  <Th>Diperbarui</Th>
                </tr>
              </thead>
              <tbody>
                {data.aplikasiTerbaru.map((a) => (
                  <tr key={a.id}>
                    <Td className="font-semibold text-slate-900">
                      <Link to={`/katalog/aplikasi/${a.id}/ubah`} className="hover:text-brand-700">
                        {a.nama}
                      </Link>
                    </Td>
                    <Td>
                      <StatusRaaBadge status={a.statusRaa} />
                    </Td>
                    <Td>
                      <StatusValidasiBadge status={a.statusValidasi} />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">{waktuRelatif(a.diperbaruiPada)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel judul="Progres flowchart" tautan={{ to: '/katalog/flowchart', label: 'Kelola' }}>
          <ul className="space-y-4">
            {data.progresFlowchart.map((p) => {
              const persen = p.total > 0 ? Math.round((p.dipublikasikan / p.total) * 100) : 0
              return (
                <li key={p.kategori}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700">{KATEGORI_LABEL[p.kategori]}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {p.dipublikasikan}/{p.total}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`Flowchart ${KATEGORI_LABEL[p.kategori]} dipublikasikan`}
                    aria-valuemin={0}
                    aria-valuemax={p.total}
                    aria-valuenow={p.dipublikasikan}
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                  >
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${persen}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AksesCepat
            item={[
              { ikon: FolderKanban, label: 'Kelola Data Aplikasi', to: '/katalog/aplikasi' },
              { ikon: ListChecks, label: 'Klasifikasi RAA', to: '/katalog/raa' },
              { ikon: Workflow, label: 'Flowchart Proses Bisnis', to: '/katalog/flowchart' },
              { ikon: BarChart3, label: 'Dasbor Instansi', to: '/katalog/dasbor' },
            ]}
          />
        </div>
        <NotifikasiRingkas notifikasi={data.notifikasi} belumDibaca={data.belumDibaca} />
      </div>
    </div>
  )
}
