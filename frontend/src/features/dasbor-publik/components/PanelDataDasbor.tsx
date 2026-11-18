import { ChevronDown, FileSpreadsheet, RotateCcw, TriangleAlert, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/toast'
import { pratinjauDataDasbor, useDataDasbor, usePulihkanDataDasbor, useTerapkanDataDasbor } from '@/features/sistem/api'
import { BARIS_RINGKASAN, BATAS_EXCEL_DASBOR_MB, type PratinjauDataDasbor, type VersiDasbor } from '@/features/sistem/types'
import { errorMessage } from '@/lib/errors'
import { formatAngka, formatWaktuLengkap, waktuRelatif } from '@/lib/format'

const waktuVersi = (v: VersiDasbor) => v.meta?.diterapkanPada ?? v.diubahPada

function AsalData({ v }: { v: VersiDasbor }) {
  if (!v.meta) return <span className="text-slate-500">Disalin manual ke server</span>
  return (
    <>
      <span className="text-slate-700">{v.meta.namaBerkas || 'Data salinan manual'}</span>
      <span className="text-slate-500"> · {v.meta.diunggahOleh}</span>
      {v.meta.dipulihkanDari && <span className="text-slate-500"> · dipulihkan dari versi {v.meta.dipulihkanDari}</span>}
    </>
  )
}

/**
 * Panel khusus Super Admin di Dasbor Analitik: unggah Excel matriks arsitektur, periksa pratinjau angka,
 * terapkan, atau pulihkan versi sebelumnya. Dasbor Publik dan Analitik langsung memakai data baru.
 */
export function PanelDataDasbor({ onTutup }: { onTutup(): void }) {
  const status = useDataDasbor()
  const terapkan = useTerapkanDataDasbor()
  const pulihkan = usePulihkanDataDasbor()
  const input = useRef<HTMLInputElement>(null)
  const [mengolah, setMengolah] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [pratinjau, setPratinjau] = useState<PratinjauDataDasbor | null>(null)
  const [riwayatTerbuka, setRiwayatTerbuka] = useState(false)
  const [konfirmasi, setKonfirmasi] = useState<VersiDasbor | null>(null)

  const pilih = async (file: File | undefined) => {
    if (!file) return
    setGalat(null)
    setPratinjau(null)
    if (!file.name.toLowerCase().endsWith('.xlsx')) return setGalat('Pilih berkas Excel berformat .xlsx.')
    if (file.size > BATAS_EXCEL_DASBOR_MB * 1024 * 1024) return setGalat(`Ukuran Excel maksimal ${BATAS_EXCEL_DASBOR_MB} MB.`)
    setMengolah(file.name)
    try {
      setPratinjau(await pratinjauDataDasbor(file))
    } catch (err) {
      setGalat(errorMessage(err))
    } finally {
      setMengolah(null)
    }
  }

  const jalankanTerapkan = () => {
    if (!pratinjau) return
    terapkan.mutate(pratinjau.idDraf, {
      onSuccess: () => {
        toast.success('Data dasbor diperbarui. Dasbor Publik dan Dasbor Analitik kini memakai data baru.')
        setPratinjau(null)
      },
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  const jalankanPulihkan = () => {
    if (!konfirmasi?.versi) return
    pulihkan.mutate(konfirmasi.versi, {
      onSuccess: () => {
        toast.success('Data dasbor dikembalikan ke versi sebelumnya.')
        setKonfirmasi(null)
      },
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  const aktif = status.data?.aktif
  const riwayat = status.data?.riwayat ?? []

  return (
    <Card className="mb-6 space-y-4 border-brand-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Perbarui data dasbor</h2>
          <p className="mt-1 text-sm text-slate-600">
            Unggah Excel Matriks Evaluasi Arsitektur SPBE dengan format yang sama. Data diperiksa dulu dan baru dipakai setelah Anda menekan
            Terapkan. Data publik dibatasi otomatis; rincian sensitif hanya tampil di Dasbor Analitik.
          </p>
        </div>
        <button type="button" onClick={onTutup} aria-label="Tutup panel" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {status.isPending ? (
        <Spinner className="justify-start" />
      ) : status.isError ? (
        <ErrorState message={errorMessage(status.error)} onRetry={() => void status.refetch()} />
      ) : (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">Data yang dipakai: </span>
          {aktif ? (
            <>
              <AsalData v={aktif} /> · diterapkan {waktuRelatif(waktuVersi(aktif))} ({formatWaktuLengkap(waktuVersi(aktif))})
            </>
          ) : (
            'belum ada.'
          )}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        id="excel-dasbor"
        onChange={(e) => {
          void pilih(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => input.current?.click()} disabled={!!mengolah || terapkan.isPending}>
          <Upload className="size-4" aria-hidden /> {mengolah ? 'Mengolah Excel…' : 'Pilih Excel'}
        </Button>
        <span className="text-xs text-slate-600">Berkas .xlsx, maksimal {BATAS_EXCEL_DASBOR_MB} MB.</span>
      </div>
      {mengolah && <Spinner className="justify-start" label={`Membaca ${mengolah}…`} />}
      {galat && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {galat}
        </p>
      )}

      {pratinjau && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div className="flex items-start gap-2 text-sm">
            <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
            <p>
              <span className="font-semibold text-slate-900">{pratinjau.namaBerkas}</span>
              <span className="text-slate-600"> berhasil dibaca. Periksa angkanya sebelum diterapkan.</span>
            </p>
          </div>
          {pratinjau.peringatan.length > 0 && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <ul className="list-disc space-y-1 pl-4">
                {pratinjau.peringatan.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Perbandingan data aktif dengan Excel baru</caption>
              <thead>
                <tr>
                  <Th>Isi</Th>
                  <Th className="text-right">Data aktif</Th>
                  <Th className="text-right">Excel baru</Th>
                  <Th className="text-right">Selisih</Th>
                </tr>
              </thead>
              <tbody>
                {BARIS_RINGKASAN.map(({ kunci, label }) => {
                  const baru = pratinjau.ringkasan[kunci]
                  const lama = pratinjau.sebelumnya?.[kunci]
                  const selisih = lama === undefined ? null : baru - lama
                  return (
                    <tr key={kunci}>
                      <Td>{label}</Td>
                      <Td className="text-right text-slate-600">{lama === undefined ? '—' : formatAngka(lama)}</Td>
                      <Td className="text-right font-semibold text-slate-900">{formatAngka(baru)}</Td>
                      <Td
                        className={`text-right ${selisih === null || selisih === 0 ? 'text-slate-400' : selisih > 0 ? 'text-emerald-700' : 'text-red-600'}`}
                      >
                        {selisih === null ? '—' : selisih === 0 ? '0' : `${selisih > 0 ? '+' : ''}${formatAngka(selisih)}`}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setPratinjau(null)} disabled={terapkan.isPending}>
              Batal
            </Button>
            <Button onClick={jalankanTerapkan} disabled={terapkan.isPending}>
              {terapkan.isPending ? 'Menerapkan…' : 'Terapkan data baru'}
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setRiwayatTerbuka((v) => !v)}
          aria-expanded={riwayatTerbuka}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <ChevronDown className={`size-4 transition ${riwayatTerbuka ? 'rotate-180' : ''}`} aria-hidden />
          Versi sebelumnya ({riwayat.length})
        </button>
        {riwayatTerbuka &&
          (riwayat.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Belum ada versi sebelumnya.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {riwayat.map((v) => (
                <li key={v.versi} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-600">{formatWaktuLengkap(waktuVersi(v))}</p>
                    <p>
                      <AsalData v={v} />
                    </p>
                    {v.ringkasan && (
                      <p className="text-xs text-slate-500">
                        {formatAngka(v.ringkasan.prosesBisnis)} proses bisnis · {formatAngka(v.ringkasan.layanan)} layanan ·{' '}
                        {formatAngka(v.ringkasan.data)} data · {formatAngka(v.ringkasan.aplikasi)} aplikasi
                      </p>
                    )}
                  </div>
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setKonfirmasi(v)}>
                    <RotateCcw className="size-3.5" aria-hidden /> Pulihkan
                  </Button>
                </li>
              ))}
            </ul>
          ))}
        <p className="mt-2 text-xs text-slate-500">Lima versi terakhir disimpan; yang lebih lama dihapus otomatis.</p>
      </div>

      <Dialog open={konfirmasi !== null} onClose={() => setKonfirmasi(null)} title="Pulihkan versi ini?">
        <p className="text-sm text-slate-600">
          Dasbor akan kembali memakai data yang diterapkan {konfirmasi && formatWaktuLengkap(waktuVersi(konfirmasi))}. Data yang sedang dipakai
          sekarang tetap disimpan di daftar versi sebelumnya.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setKonfirmasi(null)}>
            Batal
          </Button>
          <Button onClick={jalankanPulihkan} disabled={pulihkan.isPending}>
            {pulihkan.isPending ? 'Memulihkan…' : 'Pulihkan'}
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
