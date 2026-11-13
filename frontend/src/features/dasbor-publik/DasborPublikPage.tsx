import { LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { StatCard } from '@/components/ui/StatCard'
import { Tabs } from '@/components/ui/Tabs'
import { Panel } from '@/features/beranda/components/Panel'
import { errorMessage, isStatus } from '@/lib/errors'
import { formatAngka, formatTanggal } from '@/lib/format'
import { useDasborArsitektur } from './api'
import { BatangDatar } from './components/BatangDatar'
import { Katalog } from './components/Katalog'
import { KurvaRencana } from './components/KurvaRencana'
import { ProporsiBar } from './components/ProporsiBar'
import { DOMAIN, type DasborPublik, type Domain } from './types'


function Angka({ children }: { children: ReactNode }) {
  return <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</section>
}

function Batasan({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-3 rounded-xl border border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-700">
      <LockKeyhole className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

// Proses Bisnis tidak punya kolom yang disembunyikan dari umum, jadi tampilannya sama untuk publik dan internal.
function ProsesBisnis({ d }: { d: DasborPublik['prosesBisnis']; internal: boolean }) {
  return (
    <div className="space-y-6">
      <Angka>
        <StatCard label="Unit pelaksana" value={formatAngka(d.jumlahUnit)} />
        <StatCard label="Proses bisnis" value={formatAngka(d.jumlahProsesBisnis)} />
        <StatCard label="Indikator kinerja utama" value={formatAngka(d.iku.length)} />
        <StatCard label="Sektor pemerintahan" value={formatAngka(d.perSektor.length)} />
      </Angka>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Sektor pemerintahan (RAB level 1)" className="lg:col-span-2">
          <BatangDatar label="Jumlah proses bisnis per sektor pemerintahan" data={d.perSektor} />
        </Panel>
        <Panel judul="Probis utama dan sub probis">
          <ProporsiBar label="Sebaran jenis proses bisnis" satuan="proses" data={d.perJenis} />
        </Panel>
      </div>
      <Panel judul="Urusan pemerintahan (RAB level 2)">
        <BatangDatar label="Jumlah proses bisnis per urusan pemerintahan" data={d.perUrusan} />
      </Panel>
      <Katalog
        id="iku"
        judul="Indikator kinerja utama (IKU)"
        data={d.iku}
        filter={{ kunci: 'unit', label: 'Unit pelaksana' }}
        kolom={[
          { kunci: 'indikator', label: 'Indikator', utama: true },
          { kunci: 'sasaran', label: 'Sasaran strategis' },
          { kunci: 'target', label: 'Target', kelas: 'whitespace-nowrap' },
          { kunci: 'realisasi', label: 'Realisasi', kelas: 'whitespace-nowrap' },
          { kunci: 'unit', label: 'Unit pelaksana' },
        ]}
      />
      <Katalog
        id="katalog-probis"
        judul="Katalog proses bisnis"
        data={d.katalog}
        filter={{ kunci: 'unit', label: 'Unit pelaksana' }}
        kolom={[
          { kunci: 'id', label: 'ID', kelas: 'whitespace-nowrap font-mono text-xs' },
          { kunci: 'nama', label: 'Nama bisnis/urusan', utama: true },
          { kunci: 'sasaran', label: 'Sasaran strategis' },
          { kunci: 'jenis', label: 'Utama/sub', kelas: 'whitespace-nowrap' },
          { kunci: 'unit', label: 'Unit pelaksana' },
        ]}
      />
    </div>
  )
}

function Layanan({ d, internal }: { d: DasborPublik['layanan']; internal: boolean }) {
  return (
    <div className="space-y-6">
      <Angka>
        <StatCard label="Layanan" value={formatAngka(d.jumlahLayanan)} />
        <StatCard label="Unit pelaksana" value={formatAngka(d.jumlahUnit)} />
        <StatCard label="Area layanan (RAL level 2)" value={formatAngka(d.perArea.length)} />
        <StatCard label="Layanan elektronik" value={formatAngka(d.perMetode.find((m) => m.label === 'Elektronik')?.nilai ?? 0)} />
      </Angka>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel judul="Target layanan">
          <ProporsiBar label="Sebaran target layanan" satuan="layanan" data={d.perTarget} />
        </Panel>
        <Panel judul="Metode layanan">
          <ProporsiBar label="Sebaran metode layanan" satuan="layanan" data={d.perMetode} />
        </Panel>
      </div>
      <Panel judul="Domain dan area layanan (RAL level 2)">
        <BatangDatar label="Jumlah layanan per area layanan" data={d.perArea} />
      </Panel>
      <Katalog
        id="katalog-layanan"
        judul="Katalog layanan"
        data={d.katalog}
        filter={{ kunci: 'unit', label: 'Unit pelaksana' }}
        kolom={[
          { kunci: 'id', label: 'ID', kelas: 'whitespace-nowrap font-mono text-xs' },
          { kunci: 'nama', label: 'Nama layanan', utama: true },
          { kunci: 'tujuan', label: 'Tujuan' },
          { kunci: 'target', label: 'Target' },
          { kunci: 'metode', label: 'Metode', kelas: 'whitespace-nowrap' },
          { kunci: 'unit', label: 'Unit pelaksana' },
          ...(internal
            ? [
                { kunci: 'risiko' as const, label: 'Risiko' },
                { kunci: 'mitigasi' as const, label: 'Mitigasi' },
              ]
            : []),
        ]}
      />
      {!internal && <Batasan>Risiko dan mitigasi risiko layanan tidak ditampilkan untuk umum.</Batasan>}
    </div>
  )
}

function Data({ d, internal }: { d: DasborPublik['data']; internal: boolean }) {
  return (
    <div className="space-y-6">
      <Angka>
        <StatCard label="Data" value={formatAngka(d.jumlahData)} />
        <StatCard label="Jenis data" value={formatAngka(d.jumlahJenis)} />
        <StatCard label="Data terbuka" value={formatAngka(d.perSifat.find((x) => x.label === 'Terbuka')?.nilai ?? 0)} />
        <StatCard label="Kelompok data (RAD level 1)" value={formatAngka(d.perKelompok.length)} />
      </Angka>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Sifat data">
          <ProporsiBar label="Sebaran sifat data" satuan="data" data={d.perSifat} />
        </Panel>
        <Panel judul="Jenis data">
          <BatangDatar label="Jumlah data per jenis" data={d.perJenis} />
        </Panel>
        <Panel judul="Validitas data">
          <BatangDatar label="Jumlah data per frekuensi pembaruan" data={d.perValiditas} />
        </Panel>
      </div>
      <Panel judul="Kelompok data (RAD level 1)">
        <BatangDatar label="Jumlah data per kelompok" data={d.perKelompok} />
      </Panel>
      <Katalog
        id="katalog-data"
        judul={internal ? 'Katalog data' : 'Katalog data terbuka'}
        keterangan={internal ? undefined : `${formatAngka(d.tidakDitampilkan)} data bersifat Terbatas atau Tertutup hanya dihitung, tidak dirinci.`}
        data={d.katalog}
        filter={{ kunci: 'wali', label: 'Wali data' }}
        kolom={[
          { kunci: 'id', label: 'ID', kelas: 'whitespace-nowrap font-mono text-xs' },
          { kunci: 'nama', label: 'Nama data', utama: true },
          ...(internal ? [{ kunci: 'sifat' as const, label: 'Sifat' }] : []),
          { kunci: 'jenis', label: 'Jenis' },
          { kunci: 'validitas', label: 'Validitas', kelas: 'whitespace-nowrap' },
          { kunci: 'produsen', label: 'Produsen data' },
          { kunci: 'wali', label: 'Wali data' },
        ]}
      />
    </div>
  )
}

function Aplikasi({ d, internal }: { d: DasborPublik['aplikasi']; internal: boolean }) {
  return (
    <div className="space-y-6">
      <Angka>
        <StatCard label="Aplikasi" value={formatAngka(d.jumlahAplikasi)} />
        <StatCard label="Unit pelaksana" value={formatAngka(d.jumlahUnit)} />
        <StatCard label="Milik instansi daerah" value={formatAngka(d.perKepemilikan.find((k) => k.label === 'Instansi Daerah')?.nilai ?? 0)} />
        <StatCard label="Milik instansi pusat" value={formatAngka(d.perKepemilikan.find((k) => k.label === 'Instansi Pusat')?.nilai ?? 0)} />
      </Angka>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Jenis aplikasi (RAA level 1)">
          <ProporsiBar label="Sebaran aplikasi umum dan khusus" satuan="aplikasi" data={d.perJenis} />
        </Panel>
        <Panel judul="Fungsi aplikasi (RAA level 2)">
          <BatangDatar label="Jumlah aplikasi per fungsi" data={d.perFungsi} />
        </Panel>
        <Panel judul="Basis aplikasi">
          <BatangDatar label="Jumlah aplikasi per basis" data={d.perBasis} />
        </Panel>
      </div>
      <Panel judul="10 OPD dengan aplikasi terbanyak">
        <BatangDatar label="Jumlah aplikasi per OPD, sepuluh teratas" data={d.opdTeratas} batas={10} />
      </Panel>
      <Katalog
        id="katalog-aplikasi"
        judul="Katalog aplikasi"
        data={d.katalog}
        filter={{ kunci: 'unit', label: 'Unit pelaksana' }}
        kolom={[
          { kunci: 'nama', label: 'Nama aplikasi', utama: true },
          { kunci: 'fungsi', label: 'Fungsi' },
          { kunci: 'jenis', label: 'Fungsi (RAA)' },
          { kunci: 'basis', label: 'Basis', kelas: 'whitespace-nowrap' },
          { kunci: 'unit', label: 'Unit pelaksana' },
          ...(internal
            ? [
                { kunci: 'url' as const, label: 'URL' },
                { kunci: 'lokasiServer' as const, label: 'Lokasi server' },
                { kunci: 'database' as const, label: 'Basis data' },
                { kunci: 'bahasa' as const, label: 'Bahasa' },
                { kunci: 'sistemOperasi' as const, label: 'Sistem operasi' },
                { kunci: 'lisensi' as const, label: 'Lisensi' },
                { kunci: 'pengembang' as const, label: 'Pengembang' },
              ]
            : []),
        ]}
      />
      {!internal && <Batasan>Alamat, lokasi server, basis data, bahasa pemrograman, dan sistem operasi aplikasi tidak ditampilkan untuk umum.</Batasan>}
    </div>
  )
}

function Infrastruktur({ d, internal }: { d: DasborPublik['infrastruktur']; internal: boolean }) {
  const total = d.perKategori.reduce((n, k) => n + k.nilai, 0)
  return (
    <div className="space-y-6">
      <Angka>
        <StatCard label="Elemen infrastruktur" value={formatAngka(total)} />
        <StatCard label="Pusat data" value={formatAngka(d.jumlahPusatData)} />
        <StatCard label="Jaringan intra pemerintah" value={formatAngka(d.jumlahJaringanIntra)} />
        <StatCard label="Kategori arsitektur" value={formatAngka(d.perKategori.length)} />
      </Angka>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Elemen per kategori arsitektur" className="lg:col-span-2">
          <BatangDatar label="Jumlah elemen infrastruktur per kategori" data={d.perKategori} batas={11} />
        </Panel>
        <div className="space-y-6">
          <Panel judul="Kepemilikan pusat data">
            <ProporsiBar label="Sebaran kepemilikan pusat data" satuan="pusat data" data={d.pusatDataPerKepemilikan} />
          </Panel>
          <Panel judul="Klasifikasi tier pusat data">
            <BatangDatar label="Jumlah pusat data per klasifikasi tier" data={d.pusatDataPerTier} />
          </Panel>
        </div>
      </div>
      {internal && d.pusatData && (
        <Katalog
          id="katalog-pusat-data"
          judul="Pusat data"
          data={d.pusatData}
          kolom={[
            { kunci: 'nama', label: 'Nama', utama: true },
            { kunci: 'lokasi', label: 'Lokasi' },
            { kunci: 'bandwidthIntranet', label: 'Bandwidth intranet', kelas: 'whitespace-nowrap' },
            { kunci: 'bandwidthInternet', label: 'Bandwidth internet', kelas: 'whitespace-nowrap' },
            { kunci: 'tier', label: 'Tier' },
            { kunci: 'pengamanan', label: 'Pengamanan' },
            { kunci: 'kepemilikan', label: 'Kepemilikan' },
          ]}
        />
      )}
      {internal && d.server && (
        <Katalog
          id="katalog-server"
          judul="Perangkat keras server"
          data={d.server}
          filter={{ kunci: 'pemilik', label: 'Pemilik' }}
          kolom={[
            { kunci: 'nama', label: 'Nama', utama: true },
            { kunci: 'uraian', label: 'Uraian' },
            { kunci: 'lokasi', label: 'Lokasi' },
            { kunci: 'penggunaan', label: 'Penggunaan' },
            { kunci: 'memori', label: 'Memori', kelas: 'whitespace-nowrap' },
            { kunci: 'prosesor', label: 'Prosesor' },
            { kunci: 'sistemOperasi', label: 'Sistem operasi' },
            { kunci: 'pemilik', label: 'Pemilik' },
          ]}
        />
      )}
      {internal && d.katalog && (
        <Katalog
          id="katalog-infrastruktur"
          judul="Katalog elemen infrastruktur"
          data={d.katalog}
          filter={{ kunci: 'kategori', label: 'Kategori' }}
          kolom={[
            { kunci: 'id', label: 'ID', kelas: 'whitespace-nowrap font-mono text-xs' },
            { kunci: 'nama', label: 'Nama', utama: true },
            { kunci: 'kategori', label: 'Kategori' },
          ]}
        />
      )}
      {!internal && <Batasan>Nama, lokasi, dan spesifikasi perangkat infrastruktur tidak ditampilkan untuk umum; hanya jumlahnya.</Batasan>}
    </div>
  )
}

function Keamanan({ d, internal }: { d: DasborPublik['keamanan']; internal: boolean }) {
  return (
    <div className="space-y-6">
      <Angka>
        <StatCard label="Standar dan regulasi keamanan" value={formatAngka(d.jumlahStandar)} />
        <StatCard label="Kegiatan edukasi kesadaran" value={formatAngka(d.edukasiPerTahun.reduce((n, e) => n + e.nilai, 0))} />
      </Angka>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel judul="Jenis standar keamanan">
          <ProporsiBar label="Sebaran jenis standar keamanan" satuan="standar" data={d.standarPerJenis} />
        </Panel>
        <Panel judul="Edukasi kesadaran keamanan per tahun">
          <BatangDatar label="Jumlah kegiatan edukasi kesadaran keamanan per tahun" data={d.edukasiPerTahun} />
        </Panel>
      </div>
      {internal && d.katalog && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel judul="Kegiatan per subdomain">
              <BatangDatar label="Jumlah kegiatan keamanan per subdomain" data={d.perSubdomain ?? []} />
            </Panel>
            <Panel judul="Hasil audit keamanan">
              <BatangDatar label="Jumlah kegiatan per hasil audit" data={d.perHasilAudit ?? []} />
            </Panel>
            <Panel judul="Tindak lanjut audit">
              <BatangDatar label="Jumlah kegiatan per status tindak lanjut" data={d.perTindakLanjut ?? []} />
            </Panel>
          </div>
          <Katalog
            id="katalog-keamanan"
            judul="Katalog kegiatan keamanan"
            data={d.katalog}
            filter={{ kunci: 'kategori', label: 'Subdomain' }}
            kolom={[
              { kunci: 'nama', label: 'Nama', utama: true },
              { kunci: 'kategori', label: 'Subdomain' },
              { kunci: 'uraian', label: 'Uraian' },
              { kunci: 'tanggal', label: 'Tanggal', kelas: 'whitespace-nowrap' },
              { kunci: 'hasilAudit', label: 'Hasil audit' },
              { kunci: 'jenisAudit', label: 'Jenis audit' },
              { kunci: 'tindakLanjut', label: 'Tindak lanjut' },
            ]}
          />
        </>
      )}
      {!internal && <Batasan>
        Hasil audit, identifikasi kerentanan, penanganan insiden, dan perangkat keamanan tidak ditampilkan untuk umum karena dapat
        dimanfaatkan untuk menyerang sistem pemerintah.
      </Batasan>}
    </div>
  )
}

function PetaRencana({ d, internal }: { d: DasborPublik['petaRencana']; internal: boolean }) {
  return (
    <div className="space-y-6">
      <Angka>
        <StatCard label="Total kegiatan" value={formatAngka(d.totalKegiatan)} />
        <StatCard label="Sudah atau sedang dilakukan" value={formatAngka(d.sudahDilakukan)} />
        <StatCard label="Belum dilakukan" value={formatAngka(d.perStatus.find((s) => s.label === 'Belum')?.nilai ?? 0)} />
        <StatCard label="Rentang tahun" value={d.perTahun.length ? `${d.perTahun[0].label}–${d.perTahun[d.perTahun.length - 1].label}` : '–'} />
      </Angka>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel judul="Distribusi muatan rencana">
          <ProporsiBar label="Sebaran kegiatan per muatan" satuan="kegiatan" data={d.perMuatan} />
        </Panel>
        <Panel judul="Status pelaksanaan">
          <BatangDatar label="Jumlah kegiatan per status pelaksanaan" data={d.perStatus} />
        </Panel>
        <Panel judul="Kegiatan per tahun">
          <BatangDatar label="Jumlah kegiatan per tahun pelaksanaan" data={d.perTahun} />
        </Panel>
      </div>
      <Panel judul="Kurva rencana vs pelaksanaan per tahun">
        <KurvaRencana data={d.trenTahunan} />
      </Panel>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel judul="10 OPD dengan rencana terbanyak">
          <BatangDatar label="Jumlah kegiatan per OPD, sepuluh teratas" data={d.opdTeratas} batas={10} />
        </Panel>
        <Panel judul="Sasaran peta strategis teratas">
          <BatangDatar label="Jumlah kegiatan per sasaran strategis" data={d.sasaranTeratas} />
        </Panel>
      </div>
      {internal && d.katalog && (
        <Katalog
          id="katalog-rencana"
          judul="Katalog kegiatan peta rencana"
          data={d.katalog}
          filter={{ kunci: 'uic', label: 'UIC' }}
          kolom={[
            { kunci: 'aktivitas', label: 'Aktivitas', utama: true },
            { kunci: 'muatan', label: 'Muatan' },
            { kunci: 'indikator', label: 'Indikator' },
            { kunci: 'uic', label: 'UIC' },
            { kunci: 'tahun', label: 'Tahun', kelas: 'whitespace-nowrap' },
            { kunci: 'status', label: 'Status', kelas: 'whitespace-nowrap' },
            { kunci: 'nominal', label: 'Estimasi nominal', kelas: 'whitespace-nowrap' },
          ]}
        />
      )}
      {!internal && <Batasan>Estimasi nominal (anggaran) kegiatan tidak ditampilkan untuk umum.</Batasan>}
    </div>
  )
}

/**
 * Dasbor Arsitektur SPBE Kota Bogor (publik: Dasbor Publik; internal: Dasbor Analitik), tujuh domain. Tab tersimpan di URL agar bisa dibagikan.
 * `internal`: untuk semua role yang sudah masuk, tanpa batasan data; publik memakai data yang sudah dibatasi.
 */
function DasborArsitektur({ internal }: { internal: boolean }) {
  const dasbor = useDasborArsitektur(internal)
  const [params, setParams] = useSearchParams()
  const aktif = (DOMAIN.find((d) => d.key === params.get('domain'))?.key ?? 'proses-bisnis') as Domain
  const pilih = (key: Domain) => setParams(key === 'proses-bisnis' ? {} : { domain: key }, { replace: true })

  return (
    <>
      <PageHeader
        title={internal ? 'Dasbor Analitik' : 'Dasbor Publik'}
        description={`${internal ? 'Data lengkap' : 'Ringkasan'} Arsitektur SPBE Kota Bogor: proses bisnis, layanan, data, aplikasi, infrastruktur, keamanan, dan peta rencana.`}
      />
      {dasbor.isPending ? (
        <Spinner className="py-24" />
      ) : isStatus(dasbor.error, 404) ? (
        // Server belum punya data/endpoint dasbor: bukan kesalahan sistem, jadi tampil sebagai keadaan kosong.
        <EmptyState title="Data dasbor belum tersedia">Data arsitektur SPBE sedang disiapkan. Silakan kembali lagi nanti.</EmptyState>
      ) : dasbor.isError ? (
        <ErrorState message={errorMessage(dasbor.error)} onRetry={() => void dasbor.refetch()} />
      ) : (
        <Card>
          <Tabs tabs={DOMAIN} aktif={aktif} onChange={pilih} label="Domain arsitektur SPBE">
            {aktif === 'proses-bisnis' && <ProsesBisnis d={dasbor.data.prosesBisnis} internal={internal} />}
            {aktif === 'layanan' && <Layanan d={dasbor.data.layanan} internal={internal} />}
            {aktif === 'data' && <Data d={dasbor.data.data} internal={internal} />}
            {aktif === 'aplikasi' && <Aplikasi d={dasbor.data.aplikasi} internal={internal} />}
            {aktif === 'infrastruktur' && <Infrastruktur d={dasbor.data.infrastruktur} internal={internal} />}
            {aktif === 'keamanan' && <Keamanan d={dasbor.data.keamanan} internal={internal} />}
            {aktif === 'peta-rencana' && <PetaRencana d={dasbor.data.petaRencana} internal={internal} />}
          </Tabs>
          <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-600">
            Sumber: {dasbor.data.sumber.judul}, diolah {formatTanggal(dasbor.data.sumber.diolah)}.{' '}
            {internal ? 'Data lengkap untuk pengguna internal; jangan disebarkan ke luar.' : 'Hanya data yang boleh dibuka untuk umum yang ditampilkan.'}
          </p>
        </Card>
      )}
    </>
  )
}

/** /dasbor-publik: pengunjung umum, data dibatasi. */
export function DasborPublikPage() {
  return <DasborArsitektur internal={false} />
}

/** /dasbor/analitik: semua role yang sudah masuk, tanpa batasan. */
export function DasborArsitekturPage() {
  return <DasborArsitektur internal />
}
