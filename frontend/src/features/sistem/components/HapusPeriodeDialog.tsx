import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useHapusPeriode } from '../api'
import type { Periode } from '../types'

export function HapusPeriodeDialog({ periode, onClose }: { periode: Periode | null; onClose(): void }) {
  const hapus = useHapusPeriode()

  const konfirmasi = () => {
    if (!periode) return
    hapus.mutate(periode.id, {
      onSuccess: () => {
        toast.success(`Periode ${periode.nama} dihapus.`)
        onClose()
      },
      onError: (err) => {
        toast.error(errorMessage(err))
        if (err instanceof ApiError && (err.status === 404 || err.status === 409)) onClose()
      },
    })
  }

  return (
    <Dialog open={periode !== null} onClose={onClose} title="Hapus periode?">
      {periode && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Periode <span className="font-semibold text-slate-800">{periode.nama}</span> dihapus beserta jadwal pengingatnya. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button variant="danger" onClick={konfirmasi} disabled={hapus.isPending}>
              {hapus.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
