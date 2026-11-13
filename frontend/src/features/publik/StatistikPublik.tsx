import { Link } from 'react-router'
import { StatCard } from '@/components/ui/StatCard'
import { Panel } from '@/features/beranda/components/Panel'
import { useDasborArsitektur } from '@/features/dasbor-publik/api'
import { BatangDatar } from '@/features/dasbor-publik/components/BatangDatar'
import { ArsitekturPerOpd } from '@/features/dasbor-publik/components/ArsitekturPerOpd'
import { ProporsiBar } from '@/features/dasbor-publik/components/ProporsiBar'
import { formatAngka } from '@/lib/format'

/**
 * Cuplikan Dasbor Publik di halaman depan: sumber datanya sama (GET /api/dasbor/publik, sudah dibatasi untuk umum),
 * jadi angkanya selalu cocok dengan dasbor lengkap. Tidak tampil bila data dasbor belum tersedia.
 */
export function StatistikPublikSection() {
  const dasbor = useDasborArsitektur(false)
  if (!dasbor.data) return null
  const { prosesBisnis, layanan, data, aplikasi } = dasbor.data

  return (
    <section aria-labelledby="statistik-publik" className="space-y-4">
      <div>
        <h2 id="statistik-publik" className="text-lg font-semibold text-slate-900">
          Statistik Arsitektur SPBE Kota Bogor
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ringkasan dari Dasbor Publik.{' '}
          <Link to="/dasbor-publik" className="font-medium text-brand-700 hover:underline">
            Lihat dasbor lengkap
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Proses bisnis" value={formatAngka(prosesBisnis.jumlahProsesBisnis)} />
        <StatCard label="Layanan" value={formatAngka(layanan.jumlahLayanan)} />
        <StatCard label="Data" value={formatAngka(data.jumlahData)} />
        <StatCard label="Aplikasi" value={formatAngka(aplikasi.jumlahAplikasi)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Arsitektur SPBE per OPD (10 teratas)" tautan={{ to: '/dasbor-publik', label: 'Rincian' }} className="lg:col-span-2">
          <ArsitekturPerOpd data={dasbor.data.perOpd} />
        </Panel>
        <Panel judul="Metode layanan" tautan={{ to: '/dasbor-publik?domain=layanan', label: 'Rincian' }}>
          <ProporsiBar label="Sebaran metode layanan" satuan="layanan" data={layanan.perMetode} />
        </Panel>
      </div>

      <Panel judul="Proses bisnis per sektor pemerintahan" tautan={{ to: '/dasbor-publik', label: 'Rincian' }}>
        <BatangDatar label="Jumlah proses bisnis per sektor pemerintahan" data={prosesBisnis.perSektor} batas={5} />
      </Panel>
    </section>
  )
}
