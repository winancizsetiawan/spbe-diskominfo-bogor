import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useAjukanFlowchart } from '../api'
import type { Flowchart } from '../types'

export function AjukanFlowchartDialog({ flowchart, onClose }: { flowchart: Flowchart | null; onClose(): void }) {
  const ajukan = useAjukanFlowchart()

  const kirim = () => {
    if (!flowchart) return
    ajukan.mutate(flowchart.id, {
      onSuccess: (hasil) => {
        if (hasil.berhasil.length > 0) toast.success('Flowchart diajukan ke Super Admin.')
        else toast.error(hasil.dilewati[0]?.alasan ?? 'Flowchart tidak dapat diajukan.')
        onClose()
      },
      onError: (err) => {
        toast.error(err instanceof ApiError && err.status === 403 ? 'Flowchart ini bukan milik instansi Anda.' : errorMessage(err))
        onClose()
      },
    })
  }

  return (
    <Dialog open={flowchart !== null} onClose={onClose} title="Ajukan validasi flowchart">
      {flowchart && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{flowchart.nama}</span> (v{flowchart.versi}) akan diajukan ke Super Admin.
            Selama menunggu keputusan, flowchart ini tidak dapat diubah.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={kirim} disabled={ajukan.isPending}>
              {ajukan.isPending ? 'Mengajukan…' : 'Ajukan'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
