import { DatabaseBackup, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { formatUkuran, formatWaktuLengkap, waktuRelatif } from '@/lib/format'
import { useBackup, useJalankanBackup } from '../api'
import { BATAS_BACKUP_TERLAMBAT_JAM, STATUS_BACKUP } from '../types'

export function BackupPage() {
  const backup = useBackup()
  const jalankan = useJalankanBackup()

  const berjalan = !!backup.data?.items.some((b) => b.status === 'berjalan')

  const mulai = () =>
    jalankan.mutate(undefined, {
      onSuccess: () => toast.success('Backup dimulai. Hasilnya muncul di riwayat setelah selesai.'),
      onError: (err) => toast.error(errorMessage(err)),
    })

  const terakhir = backup.data?.terakhirBerhasil ?? null
  const terlambat = !!backup.data && (!terakhir || Date.now() - new Date(terakhir).getTime() > BATAS_BACKUP_TERLAMBAT_JAM * 3_600_000)

  return (
    <>
      <PageHeader
        title="Backup"
        description="Backup database dan berkas unggahan berjalan otomatis setiap hari. Super Admin juga dapat menjalankannya secara manual."
        actions={
          <Button onClick={mulai} disabled={berjalan || jalankan.isPending || !backup.data}>
            <DatabaseBackup className="size-4" aria-hidden /> {berjalan ? 'Backup berjalan…' : 'Backup Sekarang'}
          </Button>
        }
      />

      {backup.isPending ? (
        <Spinner className="py-16" />
      ) : backup.isError ? (
        <ErrorState message={errorMessage(backup.error)} onRetry={() => void backup.refetch()} />
      ) : (
        <div className="space-y-6">
          {terlambat && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                {terakhir
                  ? `Backup berhasil terakhir sudah lebih dari ${BATAS_BACKUP_TERLAMBAT_JAM} jam lalu.`
                  : 'Belum ada backup yang berhasil.'}{' '}
                Jalankan backup manual dan periksa penjadwal di server.
              </p>
            </div>
          )}

          <section aria-label="Ringkasan backup" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Jadwal otomatis</p>
              <p className="mt-1 font-semibold text-slate-900">{backup.data.jadwal}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Retensi</p>
              <p className="mt-1 font-semibold text-slate-900">{backup.data.retensi} backup terakhir</p>
              <p className="text-xs text-slate-500">Yang lebih lama dihapus otomatis.</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Berhasil terakhir</p>
              <p className="mt-1 font-semibold text-slate-900">{terakhir ? waktuRelatif(terakhir) : 'Belum ada'}</p>
              {terakhir && <p className="text-xs text-slate-500">{formatWaktuLengkap(terakhir)}</p>}
            </Card>
          </section>

          <section aria-labelledby="riwayat-backup">
            <h2 id="riwayat-backup" className="mb-3 text-lg font-semibold text-slate-900">
              Riwayat backup
            </h2>
            {backup.data.items.length === 0 ? (
              <EmptyState title="Belum ada riwayat backup." />
            ) : (
              <Table caption={`Riwayat ${backup.data.items.length} backup terakhir`}>
                <thead>
                  <tr>
                    <Th>Waktu</Th>
                    <Th>Jenis</Th>
                    <Th>Status</Th>
                    <Th>Ukuran</Th>
                    <Th>Dijalankan oleh</Th>
                  </tr>
                </thead>
                <tbody>
                  {backup.data.items.map((b) => {
                    const st = STATUS_BACKUP[b.status]
                    return (
                      <tr key={b.id}>
                        <Td className="whitespace-nowrap font-mono text-xs text-slate-600">
                          <time dateTime={b.waktu}>{formatWaktuLengkap(b.waktu)}</time>
                        </Td>
                        <Td>{b.tipe === 'otomatis' ? 'Otomatis' : 'Manual'}</Td>
                        <Td>
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {b.pesanGagal && <p className="mt-1 text-xs text-red-600">{b.pesanGagal}</p>}
                        </Td>
                        <Td className="text-slate-600">{b.ukuranMb === null ? '—' : formatUkuran(b.ukuranMb)}</Td>
                        <Td className="text-slate-600">{b.oleh ?? 'Penjadwal'}</Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Berkas backup disimpan di lokasi aman pada server dan tidak dapat diunduh dari portal. Pemulihan data dilakukan oleh administrator infrastruktur.
            </p>
          </section>
        </div>
      )}
    </>
  )
}
