import { FileSpreadsheet, RotateCcw, TriangleAlert, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { formatAngka, formatTanggalSingkat, formatWaktuLengkap, waktuRelatif } from '@/lib/format'
import { pratinjauDataDasbor, useDataDasbor, usePulihkanDataDasbor, useTerapkanDataDasbor } from '../api'
import { BARIS_RINGKASAN, BATAS_EXCEL_DASBOR_MB, type PratinjauDataDasbor, type VersiDasbor } from '../types'

const labelVersi = (v: VersiDasbor) => formatWaktuLengkap(v.meta?.diterapkanPada ?? v.diubahPada)

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

/** Super Admin memperbarui Dasbor Publik dan Dasbor Analitik dengan mengunggah Excel matriks arsitektur SPBE. */
export function DataDasborPage() {
  const status = useDataDasbor()
  const terapkan = useTerapkanDataDasbor()
  const pulihkan = usePulihkanDataDasbor()
  const input = useRef<HTMLInputElement>(null)
  const [mengolah, setMengolah] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [pratinjau, setPratinjau] = useState<PratinjauDataDasbor | null>(null)
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

  return (
    <>
      <PageHeader
        title="Data Dasbor"
        description="Perbarui Dasbor Publik dan Dasbor Analitik dengan mengunggah Excel Matriks Evaluasi SPBE Architecture. Data publik otomatis dibatasi; rincian sensitif hanya tampil di Dasbor Analitik untuk pengguna yang masuk."
      />

      {status.isPending ? (
        <Spinner className="py-16" />
      ) : status.isError ? (
        <ErrorState message={errorMessage(status.error)} onRetry={() => void status.refetch()} />
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="data-aktif">
            <Card>
              <h2 id="data-aktif" className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Data yang sedang dipakai
              </h2>
              {status.data.aktif ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-semibold text-slate-900">{status.data.aktif.ringkasan?.judul ?? 'Data dasbor'}</p>
                  <p>
                    <AsalData v={status.data.aktif} />
                  </p>
                  <p className="text-slate-500">
                    Diterapkan {waktuRelatif(status.data.aktif.meta?.diterapkanPada ?? status.data.aktif.diubahPada)} ({labelVersi(status.data.aktif)})
                    {status.data.aktif.ringkasan?.diolah && <> · Excel diolah {formatTanggalSingkat(status.data.aktif.ringkasan.diolah)}</>}
                  </p>
                  <p className="pt-1">
                    <Link to="/dasbor/analitik" className="font-medium text-brand-700 hover:underline">
                      Buka Dasbor Analitik
                    </Link>
                    <span className="text-slate-400"> · </span>
                    <Link to="/dasbor-publik" className="font-medium text-brand-700 hover:underline" target="_blank">
                      Buka Dasbor Publik
                    </Link>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Belum ada data. Dasbor menampilkan pesan "data belum tersedia" sampai Excel diunggah.</p>
              )}
            </Card>
          </section>

          <section aria-labelledby="unggah-excel">
            <Card className="space-y-4">
              <div>
                <h2 id="unggah-excel" className="text-lg font-semibold text-slate-900">
                  Perbarui dari Excel
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Gunakan format Excel yang sama (sheet 1-Domain Proses Bisnis, 4-Domain Layanan, 5-Domain Data, Aplikasi-Sort, dst.). Data diperiksa
                  dulu dan baru dipakai setelah Anda menekan Terapkan. Versi lama disimpan dan dapat dipulihkan.
                </p>
              </div>
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
                  {/* Tabel kecil 4 kolom: tidak memakai <Table> (lebar minimal 720px) agar kolom Selisih tetap terlihat di layar sempit. */}
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
            </Card>
          </section>

          <section aria-labelledby="riwayat-dasbor">
            <h2 id="riwayat-dasbor" className="mb-3 text-lg font-semibold text-slate-900">
              Versi sebelumnya
            </h2>
            {status.data.riwayat.length === 0 ? (
              <EmptyState title="Belum ada versi sebelumnya." />
            ) : (
              <Table caption={`${status.data.riwayat.length} versi terakhir yang disimpan`}>
                <thead>
                  <tr>
                    <Th>Diterapkan</Th>
                    <Th>Asal</Th>
                    <Th className="text-right">Proses bisnis</Th>
                    <Th className="text-right">Layanan</Th>
                    <Th className="text-right">Data</Th>
                    <Th className="text-right">Aplikasi</Th>
                    <Th>
                      <span className="sr-only">Aksi</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {status.data.riwayat.map((v) => (
                    <tr key={v.versi}>
                      <Td className="whitespace-nowrap font-mono text-xs text-slate-600">{labelVersi(v)}</Td>
                      <Td className="text-sm">
                        <AsalData v={v} />
                      </Td>
                      <Td className="text-right">{v.ringkasan ? formatAngka(v.ringkasan.prosesBisnis) : '—'}</Td>
                      <Td className="text-right">{v.ringkasan ? formatAngka(v.ringkasan.layanan) : '—'}</Td>
                      <Td className="text-right">{v.ringkasan ? formatAngka(v.ringkasan.data) : '—'}</Td>
                      <Td className="text-right">{v.ringkasan ? formatAngka(v.ringkasan.aplikasi) : '—'}</Td>
                      <Td className="text-right">
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setKonfirmasi(v)}>
                          <RotateCcw className="size-3.5" aria-hidden /> Pulihkan
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <p className="mt-3 text-xs text-slate-600">Lima versi terakhir disimpan; yang lebih lama dihapus otomatis.</p>
          </section>
        </div>
      )}

      <Dialog open={konfirmasi !== null} onClose={() => setKonfirmasi(null)} title="Pulihkan versi ini?">
        <p className="text-sm text-slate-600">
          Dasbor akan kembali memakai data yang diterapkan {konfirmasi && labelVersi(konfirmasi)}. Data yang sedang dipakai sekarang tetap disimpan
          di daftar versi sebelumnya.
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
    </>
  )
}
