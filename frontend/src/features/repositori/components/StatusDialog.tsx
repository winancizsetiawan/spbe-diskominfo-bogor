import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/toast'
import { STATUS_LABEL, type Dokumen, type StatusDokumen } from '@/features/dokumen/types'
import { errorMessage } from '@/lib/errors'
import { useUbahStatus } from '../api'
import { AKSI_STATUS, TRANSISI_STATUS } from '../types'
import { StatusDokumenBadge } from './StatusDokumenBadge'

interface Props {
  dokumen: Dokumen | null
  onClose(): void
}

export function StatusDialog({ dokumen, onClose }: Props) {
  const ubah = useUbahStatus()
  const [pilihan, setPilihan] = useState<StatusDokumen | null>(null)

  useEffect(() => {
    if (dokumen) setPilihan(null)
  }, [dokumen])

  const opsi = dokumen ? TRANSISI_STATUS[dokumen.status] : []

  const simpan = () => {
    if (!dokumen || !pilihan) return
    ubah.mutate(
      { id: dokumen.id, status: pilihan },
      {
        onSuccess: () => {
          toast.success(`${dokumen.judul}: status menjadi ${STATUS_LABEL[pilihan]}.`)
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) toast.error('Status dokumen sudah berubah. Daftar dimuat ulang.')
          else toast.error(errorMessage(err))
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={dokumen !== null} onClose={onClose} title="Ubah status dokumen">
      {dokumen && (
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-slate-900">{dokumen.judul}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              Status saat ini: <StatusDokumenBadge status={dokumen.status} />
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Ubah menjadi</legend>
            <div className="space-y-2">
              {opsi.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-checked:border-brand-500 has-checked:bg-brand-50"
                >
                  <input
                    type="radio"
                    name="status-baru"
                    value={s}
                    checked={pilihan === s}
                    onChange={() => setPilihan(s)}
                    className="mt-1"
                    aria-describedby={`status-${s}-info`}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{AKSI_STATUS[s].label}</span>
                    <span id={`status-${s}-info`} className="block text-xs text-slate-500">
                      {AKSI_STATUS[s].keterangan}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={simpan} disabled={!pilihan || ubah.isPending}>
              {ubah.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
