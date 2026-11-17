import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useUbahPenerima } from '../api'
import type { PenggunaForum } from '../types'
import { PilihPenerima } from './PilihPenerima'

interface Props {
  open: boolean
  threadId: number
  penerima: PenggunaForum[]
  onClose(): void
}

/** Penugasan ulang: pembuat thread atau Super Admin mengganti siapa yang boleh menjawab. */
export function PenugasanDialog({ open, threadId, penerima, onClose }: Props) {
  const ubah = useUbahPenerima(threadId)
  const [pilihan, setPilihan] = useState<PenggunaForum[]>(penerima)
  const [galat, setGalat] = useState<string>()

  useEffect(() => {
    if (open) {
      setPilihan(penerima)
      setGalat(undefined)
    }
  }, [open, penerima])

  const simpan = () =>
    ubah.mutate(
      pilihan.map((p) => p.id),
      {
        onSuccess: () => {
          toast.success(pilihan.length ? 'Penugasan diperbarui.' : 'Thread kini terbuka untuk semua pengguna.')
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.fieldErrors.penerima) setGalat(err.fieldErrors.penerima)
          else toast.error(errorMessage(err))
        },
      },
    )

  return (
    <Dialog open={open} onClose={onClose} title="Atur penugasan">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Hanya penerima dan pembuat thread yang dapat membalas; pengguna lain hanya membaca. Kosongkan daftar agar
          semua pengguna dapat membalas.
          Penerima baru akan mendapat notifikasi.
        </p>
        <PilihPenerima id="penugasan-penerima" value={pilihan} onChange={setPilihan} mengambang={false} />
        {galat && (
          <p role="alert" className="text-sm text-red-600">
            {galat}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={simpan} disabled={ubah.isPending}>
            {ubah.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
