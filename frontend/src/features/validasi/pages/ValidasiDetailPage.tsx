import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { DiagramPanel } from '@/features/flowchart/components/DiagramPanel'
import { JENIS_LABEL, KATEGORI_LABEL } from '@/features/flowchart/types'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage, isStatus } from '@/lib/errors'
import { formatTanggal } from '@/lib/format'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useReferensiRaa } from '@/features/katalog/api'
import { NilaiBar } from '@/features/katalog/components/NilaiBar'
import { StatusRaaBadge, StatusValidasiBadge } from '@/features/katalog/components/StatusBadge'
import { labelRaa } from '@/features/katalog/types'
import { usePengajuan } from '../api'
import { KeputusanForm } from '../components/KeputusanForm'
import { JENIS_DATA_LABEL } from '../types'

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 sm:col-span-2">{children}</dd>
    </div>
  )
}

export function ValidasiDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const pengajuan = usePengajuan(id)
  const raa = useReferensiRaa()

  if (!Number.isInteger(id) || id <= 0 || isStatus(pengajuan.error, 404)) return <NotFoundPage />
  if (isStatus(pengajuan.error, 403)) return <ForbiddenPage />
  if (pengajuan.isPending) return <Spinner className="py-24" />
  if (pengajuan.isError) return <ErrorState message={errorMessage(pengajuan.error)} onRetry={() => void pengajuan.refetch()} />

  const p = pengajuan.data
  const a = p.data
  const f = p.proses
  const klasifikasi = a ? labelRaa(a.raa, raa.data) : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/admin/validasi" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke daftar validasi
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{p.aplikasi.nama}</h1>
        <StatusValidasiBadge status={p.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="font-semibold text-slate-900">Data yang diajukan</h2>
          <dl className="mt-2 divide-y divide-slate-100">
            <Baris label="Instansi">{p.instansi.nama}</Baris>
            <Baris label="Jenis data">{JENIS_DATA_LABEL[p.jenisData]}</Baris>
            <Baris label="Diajukan oleh">
              {p.pengaju} · <time dateTime={p.tanggalPengajuan}>{formatTanggal(p.tanggalPengajuan)}</time>
            </Baris>
            {a && (
              <>
                <Baris label="Deskripsi">{a.deskripsi || <span className="text-slate-500 italic">Belum diisi</span>}</Baris>
                <Baris label="Kategori">{a.kategori ?? <span className="text-slate-500 italic">Belum dipilih</span>}</Baris>
                <Baris label="Klasifikasi RAA">
                  {klasifikasi ?? <span className="text-slate-500 italic">Belum diklasifikasi</span>}
                  <span className="mt-1 block text-xs text-slate-500">
                    Level 1: {a.raa.level1 ?? '—'} · Level 2: {a.raa.level2 ?? '—'} · Level 3: {a.raa.level3 ?? '—'}
                  </span>
                </Baris>
                <Baris label="Kesesuaian">
                  <div className="flex flex-wrap items-center gap-3">
                    <NilaiBar nilai={a.nilaiKesesuaian} />
                    <StatusRaaBadge status={a.statusRaa} />
                  </div>
                </Baris>
              </>
            )}
            {f && (
              <>
                <Baris label="Kode dan versi">
                  <span className="font-mono">{f.kode}</span> · v{f.versi}
                </Baris>
                <Baris label="Kategori">
                  {KATEGORI_LABEL[f.kategori]} · {JENIS_LABEL[f.jenis]}
                </Baris>
                <Baris label="PIC">{f.pic}</Baris>
                <Baris label="Deskripsi">{f.deskripsi || <span className="text-slate-500 italic">Belum diisi</span>}</Baris>
                <Baris label="Aplikasi terkait">
                  {f.aplikasi.length > 0 ? f.aplikasi.map((x) => x.nama).join(', ') : <span className="text-slate-500 italic">Belum ada</span>}
                </Baris>
                <Baris label="Diagram">
                  <Link to={`/katalog/flowchart/${f.id}`} className="text-brand-700 hover:underline">
                    Buka halaman flowchart
                  </Link>
                </Baris>
              </>
            )}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          {p.status === 'menunggu' ? (
            <>
              <h2 className="mb-4 font-semibold text-slate-900">Keputusan</h2>
              <KeputusanForm pengajuanId={p.id} namaAplikasi={p.aplikasi.nama} onSelesai={() => navigate('/admin/validasi')} />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-slate-900">Hasil validasi</h2>
              <dl className="mt-2 divide-y divide-slate-100">
                <Baris label="Status">
                  <StatusValidasiBadge status={p.status} />
                </Baris>
                <Baris label="Diputuskan">{p.tanggalPutusan ? formatTanggal(p.tanggalPutusan) : '—'}</Baris>
                <Baris label="Catatan">{p.catatan ?? <span className="text-slate-500 italic">Tidak ada catatan</span>}</Baris>
              </dl>
              <p className="mt-3 text-xs text-slate-500">Keputusan yang sudah tersimpan tidak dapat diubah dari halaman ini.</p>
            </>
          )}
        </Card>

        {/* Diagram di bawah keputusan agar moderator dapat menilai dan memutuskan di satu halaman. */}
        {f && (
          <Card className="lg:col-span-5">
            <h2 className="mb-3 font-semibold text-slate-900">Diagram proses</h2>
            <DiagramPanel id={f.id} />
          </Card>
        )}
      </div>
    </div>
  )
}
