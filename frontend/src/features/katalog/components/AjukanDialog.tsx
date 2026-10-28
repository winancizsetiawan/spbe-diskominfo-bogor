import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useAjukanValidasi, useSiapDiajukan } from '../api'
import type { Aplikasi, HasilAjukan } from '../types'

/** Satu aplikasi (dari Data Aplikasi) atau semua yang siap diajukan (Ajukan Semua RAA). */
export type TargetAjukan = { jenis: 'satu'; aplikasi: Pick<Aplikasi, 'id' | 'nama'> } | { jenis: 'semua' }

interface Props {
  target: TargetAjukan | null
  onClose(): void
}

export function AjukanDialog({ target, onClose }: Props) {
  const semua = target?.jenis === 'semua'
  const siap = useSiapDiajukan(semua)
  const ajukan = useAjukanValidasi()
  const [hasil, setHasil] = useState<HasilAjukan | null>(null)

  useEffect(() => {
    if (target) setHasil(null)
  }, [target])

  const daftar = target?.jenis === 'satu' ? [target.aplikasi] : (siap.data ?? [])

  const kirim = () => {
    ajukan.mutate(
      { jenisData: semua ? 'raa' : 'aplikasi', targetIds: daftar.map((a) => a.id) },
      {
        onSuccess: (h) => {
          if (h.berhasil.length > 0) toast.success(`${h.berhasil.length} data diajukan ke Super Admin.`)
          // Tampilkan item yang dilewati di dialog; bila tidak ada, dialog langsung ditutup.
          if (h.dilewati.length > 0) setHasil(h)
          else onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) toast.error('Sebagian data sudah berubah status. Daftar dimuat ulang.')
          else if (err instanceof ApiError && err.status === 403) toast.error('Data ini bukan milik instansi Anda.')
          else toast.error(errorMessage(err))
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={target !== null} onClose={onClose} title={semua ? 'Ajukan Semua RAA' : 'Ajukan Validasi'}>
      {hasil ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            {hasil.berhasil.length} data diajukan. {hasil.dilewati.length} data dilewati:
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {hasil.dilewati.map((d) => (
              <li key={d.id} className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                <span className="font-medium">{d.nama}</span> — {d.alasan}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onClick={onClose}>Tutup</Button>
          </div>
        </div>
      ) : semua && siap.isPending ? (
        <Spinner className="py-6" />
      ) : daftar.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Tidak ada data berstatus Draft atau Perlu Revisi yang bisa diajukan.</p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {semua
              ? `${daftar.length} aplikasi berstatus Draft atau Perlu Revisi akan diajukan ke Super Admin:`
              : 'Data berikut akan diajukan ke Super Admin. Selama menunggu keputusan, data tidak dapat diubah.'}
          </p>
          <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm font-medium text-slate-800">
            {daftar.map((a) => (
              <li key={a.id}>{a.nama}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={kirim} disabled={ajukan.isPending}>
              {ajukan.isPending ? 'Mengajukan…' : semua ? `Ajukan ${daftar.length} data` : 'Ajukan'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
