import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useHapusPengguna } from '../api'
import type { Pengguna } from '../types'

/** Konfirmasi hapus permanen. Bedakan jelas dari Nonaktifkan, yang bisa dibatalkan. */
export function HapusDialog({ pengguna, onClose }: { pengguna: Pengguna | null; onClose(): void }) {
  const hapus = useHapusPengguna()

  const simpan = () => {
    if (!pengguna) return
    hapus.mutate(pengguna.id, {
      onSuccess: () => {
        toast.success(`Akun ${pengguna.nama} dihapus.`)
        onClose()
      },
      onError: (err) => {
        // 409 berisi alasan yang jelas dari server (akun sendiri / punya konten forum).
        toast.error(errorMessage(err))
        onClose()
      },
    })
  }

  return (
    <Dialog open={pengguna !== null} onClose={onClose} title="Hapus pengguna">
      {pengguna && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{pengguna.nama}</span> · {pengguna.email}
          </p>
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold">Penghapusan bersifat permanen dan tidak dapat dibatalkan.</p>
              <p>Profil, notifikasi, dan progres pembelajaran pengguna ikut terhapus. Riwayat aktivitasnya tetap tercatat di Audit Trail.</p>
              <p>Bila hanya ingin mencabut akses sementara, gunakan Nonaktifkan.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button variant="danger" onClick={simpan} disabled={hapus.isPending}>
              {hapus.isPending ? 'Menghapus…' : 'Ya, hapus permanen'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
