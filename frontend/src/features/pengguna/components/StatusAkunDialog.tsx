import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useUbahPengguna } from '../api'
import type { Pengguna } from '../types'

export type AksiStatus = 'nonaktifkan' | 'aktifkan' | 'batalkan'

export interface TargetStatus {
  pengguna: Pengguna
  aksi: AksiStatus
}

const INFO: Record<AksiStatus, { judul: string; tombol: string; keterangan: string; selesai: string; bahaya: boolean }> = {
  nonaktifkan: {
    judul: 'Nonaktifkan akun',
    tombol: 'Ya, nonaktifkan',
    keterangan: 'Pengguna tidak dapat masuk ke portal. Akun SSO-nya tidak dihapus dan dapat diaktifkan kembali.',
    selesai: 'Akun dinonaktifkan.',
    bahaya: true,
  },
  aktifkan: {
    judul: 'Aktifkan kembali akun',
    tombol: 'Ya, aktifkan',
    keterangan: 'Pengguna dapat masuk lagi ke portal dengan peran yang sama.',
    selesai: 'Akun diaktifkan kembali.',
    bahaya: false,
  },
  batalkan: {
    judul: 'Batalkan undangan',
    tombol: 'Ya, batalkan',
    keterangan: 'Undangan tidak berlaku lagi. Undang ulang dengan mengaktifkan akunnya kembali.',
    selesai: 'Undangan dibatalkan.',
    bahaya: true,
  },
}

export function StatusAkunDialog({ target, onClose }: { target: TargetStatus | null; onClose(): void }) {
  const ubah = useUbahPengguna()
  const info = target ? INFO[target.aksi] : null

  const simpan = () => {
    if (!target || !info) return
    ubah.mutate(
      { id: target.pengguna.id, statusAkun: target.aksi === 'aktifkan' ? 'aktif' : 'nonaktif' },
      {
        onSuccess: () => {
          toast.success(info.selesai)
          onClose()
        },
        onError: (err) => {
          toast.error(err instanceof ApiError && err.status === 409 ? `${err.message} Daftar dimuat ulang.` : errorMessage(err))
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={target !== null} onClose={onClose} title={info?.judul ?? ''}>
      {target && info && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{target.pengguna.nama}</span> · {target.pengguna.email}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{info.keterangan}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button variant={info.bahaya ? 'danger' : 'primary'} onClick={simpan} disabled={ubah.isPending}>
              {ubah.isPending ? 'Menyimpan…' : info.tombol}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
