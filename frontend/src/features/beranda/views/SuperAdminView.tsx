import { ClipboardCheck, FileUp, ShieldAlert, Users } from 'lucide-react'
import { DonutChart } from '@/components/charts/DonutChart'
import { LineChart } from '@/components/charts/LineChart'
import { WARNA } from '@/components/charts/warna'
import { StatCard } from '@/components/ui/StatCard'
import { formatAngka, formatHariBulan } from '@/lib/format'
import { AksesCepat } from '../components/AksesCepat'
import { NotifikasiRingkas } from '../components/NotifikasiRingkas'
import { Panel } from '../components/Panel'
import type { BerandaSuperAdmin } from '../types'

export function SuperAdminView({ data }: { data: BerandaSuperAdmin }) {
  const { ringkasan: r, statusValidasi: s } = data
  return (
    <div className="space-y-8">
      <section aria-label="Ringkasan sistem" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total pengguna" value={formatAngka(r.totalPengguna)} />
        <StatCard label="Instansi terdaftar" value={formatAngka(r.instansiTerdaftar)} />
        <StatCard label="Dokumen dan SOP" value={formatAngka(r.totalDokumen)} />
        <StatCard label="Menunggu validasi" value={formatAngka(r.menungguValidasi)} tone={r.menungguValidasi > 0 ? 'warning' : 'neutral'} hint="Pengajuan dari Admin OPD" />
        <StatCard label="Thread forum" value={formatAngka(r.threadForum)} />
        <StatCard label="Laporan forum baru" value={formatAngka(r.laporanBaru)} tone={r.laporanBaru > 0 ? 'danger' : 'neutral'} hint="Menunggu tinjauan moderator" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Aktivitas sistem 30 hari terakhir" className="lg:col-span-2">
          <LineChart
            label="Jumlah login, validasi, unggahan dokumen, dan aktivitas forum per hari"
            data={data.aktivitas.map((a) => ({ label: formatHariBulan(a.tanggal), login: a.login, validasi: a.validasi, unggahan: a.unggahan, forum: a.forum }))}
            series={[
              { kunci: 'login', label: 'Login', warna: WARNA.brand },
              { kunci: 'validasi', label: 'Validasi data', warna: WARNA.hijau, pola: '5 3' },
              { kunci: 'unggahan', label: 'Unggahan dokumen', warna: WARNA.kuning, pola: '2 3' },
              { kunci: 'forum', label: 'Aktivitas forum', warna: WARNA.ungu, pola: '8 3 2 3' },
            ]}
          />
        </Panel>

        <Panel judul="Status validasi data" tautan={{ to: '/admin/validasi', label: 'Buka validasi' }}>
          <DonutChart
            label="Sebaran status pengajuan validasi"
            pusat="pengajuan"
            data={[
              { label: 'Menunggu', nilai: s.menunggu, warna: WARNA.brand },
              { label: 'Disetujui', nilai: s.disetujui, warna: WARNA.hijau },
              { label: 'Perlu revisi', nilai: s.perlu_revisi, warna: WARNA.kuning },
              { label: 'Ditolak', nilai: s.ditolak, warna: WARNA.merah },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AksesCepat
            item={[
              { ikon: ClipboardCheck, label: 'Validasi Data', to: '/admin/validasi' },
              { ikon: ShieldAlert, label: 'Moderasi Forum', to: '/admin/moderasi' },
              { ikon: FileUp, label: 'Repositori & Artikel', to: '/admin/repositori' },
              { ikon: Users, label: 'Manajemen Pengguna', to: '/admin/pengguna' },
            ]}
          />
        </div>
        <NotifikasiRingkas notifikasi={data.notifikasi} belumDibaca={data.belumDibaca} judul="Notifikasi penting" />
      </div>
    </div>
  )
}
