import { ClipboardCheck, FileUp, ShieldAlert, Users } from 'lucide-react'
import { DonutChart } from '@/components/charts/DonutChart'
import { BarChart } from '@/components/charts/BarChart'
import { WARNA } from '@/components/charts/warna'
import { StatCard } from '@/components/ui/StatCard'
import { formatAngka, formatHariBulan } from '@/lib/format'
import { AksesCepat } from '../components/AksesCepat'
import { NotifikasiRingkas } from '../components/NotifikasiRingkas'
import { Panel } from '../components/Panel'
import type { AktivitasHarian, BerandaSuperAdmin } from '../types'

/**
 * Data harian dijumlah per 7 hari (28 hari terakhir) agar menjadi beberapa kelompok batang yang lebar;
 * 30 hari x 4 jenis aktivitas sebagai batang harian terlalu rapat untuk dibaca.
 */
function perMinggu(harian: AktivitasHarian[]) {
  const akhir = harian.slice(-28)
  return Array.from({ length: Math.ceil(akhir.length / 7) }, (_, i) => {
    const minggu = akhir.slice(i * 7, i * 7 + 7)
    const jumlah = (k: 'login' | 'validasi' | 'unggahan' | 'forum') => minggu.reduce((n, h) => n + h[k], 0)
    return {
      label: `${formatHariBulan(minggu[0].tanggal)}–${formatHariBulan(minggu[minggu.length - 1].tanggal)}`,
      login: jumlah('login'),
      validasi: jumlah('validasi'),
      unggahan: jumlah('unggahan'),
      forum: jumlah('forum'),
    }
  })
}

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
        <Panel judul="Aktivitas sistem 4 minggu terakhir" className="lg:col-span-2">
          <BarChart
            label="Jumlah login, validasi, unggahan dokumen, dan aktivitas forum per minggu"
            data={perMinggu(data.aktivitas)}
            series={[
              { kunci: 'login', label: 'Login', warna: '#1e2869' },
              { kunci: 'validasi', label: 'Validasi data', warna: '#3b4fc4' },
              { kunci: 'unggahan', label: 'Unggahan dokumen', warna: '#8b9be6' },
              { kunci: 'forum', label: 'Aktivitas forum', warna: '#c7cff3' },
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
