import { Power, PowerOff, Send, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { ROLE_LABEL, type Role } from '@/auth/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useInstansiPengguna, useUbahPengguna } from '../api'
import { instansiBolehUntuk, STATUS_AKUN_LABEL, URUTAN_ROLE, type Pengguna } from '../types'
import { InstansiSelect } from './InstansiSelect'
import type { TargetStatus } from './StatusAkunDialog'

interface FormValues {
  role: Role
  idInstansi: string
}

interface Props {
  pengguna: Pengguna | null
  onClose(): void
  /** Aksi akun dibuka di dialog konfirmasi masing-masing; dialog Ubah ditutup lebih dulu agar tidak bertumpuk. */
  onStatus(target: TargetStatus): void
  onHapus(pengguna: Pengguna): void
  onKirimUlang(pengguna: Pengguna): void
  kirimUlangBerjalan?: boolean
}

/** Satu pintu untuk mengelola pengguna: peran & instansi, akses akun (aktif/nonaktif/undangan), dan hapus. */
export function UbahDialog({ pengguna, onClose, onStatus, onHapus, onKirimUlang, kirimUlangBerjalan }: Props) {
  const instansi = useInstansiPengguna()
  const ubah = useUbahPengguna()
  const { register, handleSubmit, reset, setError, watch, formState: { errors } } = useForm<FormValues>()
  const role = watch('role') ?? pengguna?.role ?? 'asn'

  useEffect(() => {
    if (pengguna) reset({ role: pengguna.role, idInstansi: String(pengguna.instansi.id) })
  }, [pengguna, reset])

  const kirim = handleSubmit((v) => {
    if (!pengguna) return
    // Hanya kirim yang berubah agar server tidak mencatat perubahan palsu.
    const input = {
      id: pengguna.id,
      ...(v.role !== pengguna.role && { role: v.role }),
      ...(Number(v.idInstansi) !== pengguna.instansi.id && { idInstansi: Number(v.idInstansi) }),
    }
    if (Object.keys(input).length === 1) return setError('role', { message: 'Tidak ada perubahan.' })
    ubah.mutate(input, {
      onSuccess: () => {
        toast.success(`Data ${pengguna.nama} diperbarui. Pengguna diberi tahu lewat notifikasi.`)
        onClose()
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) {
          for (const [field, message] of Object.entries(err.fieldErrors)) setError(field as keyof FormValues, { message })
        } else {
          toast.error(errorMessage(err))
          if (err instanceof ApiError && err.status === 409) onClose()
        }
      },
    })
  })

  return (
    <Dialog open={pengguna !== null} onClose={onClose} title="Ubah pengguna">
      {pengguna && (
        <div className="space-y-6">
        <form onSubmit={kirim} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{pengguna.nama}</span> · {pengguna.email}
          </p>
          <h3 className="text-sm font-semibold text-slate-900">Peran dan instansi</h3>

          <Field id="ubah-role" label="Peran" error={errors.role?.message}>
            <select id="ubah-role" className={inputClass} aria-invalid={!!errors.role} {...register('role')}>
              {URUTAN_ROLE.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>

          <Field id="ubah-instansi" label="Instansi" error={errors.idInstansi?.message}>
            <InstansiSelect
              id="ubah-instansi"
              instansi={instansi.data}
              role={role}
              aria-invalid={!!errors.idInstansi}
              {...register('idInstansi', {
                validate: (v) => {
                  if (!v) return 'Pilih instansi.'
                  const dipilih = instansi.data?.find((i) => i.id === Number(v))
                  return !dipilih || instansiBolehUntuk(role, dipilih) || 'Admin OPD harus berasal dari OPD.'
                },
              })}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={ubah.isPending}>
              {ubah.isPending ? 'Menyimpan…' : 'Simpan perubahan'}
            </Button>
          </div>
        </form>

        <section aria-labelledby="ubah-akses" className="space-y-3 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 id="ubah-akses" className="text-sm font-semibold text-slate-900">
              Akses akun
            </h3>
            <Badge tone={STATUS_AKUN_LABEL[pengguna.statusAkun].tone}>{STATUS_AKUN_LABEL[pengguna.statusAkun].label}</Badge>
          </div>
          <p className="text-sm text-slate-600">
            {pengguna.statusAkun === 'nonaktif'
              ? 'Akun ini tidak dapat masuk ke portal. Aktifkan kembali untuk memulihkan akses dengan peran yang sama.'
              : pengguna.statusAkun === 'diundang'
                ? 'Pengguna belum menerima undangan. Kirim ulang undangan atau batalkan bila tidak jadi.'
                : 'Nonaktifkan untuk mencabut akses sementara. Akun dapat diaktifkan kembali kapan saja.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {pengguna.statusAkun === 'diundang' && (
              <Button variant="secondary" onClick={() => onKirimUlang(pengguna)} disabled={kirimUlangBerjalan} aria-label={`Kirim ulang undangan ${pengguna.nama}`}>
                <Send className="size-4" aria-hidden /> Kirim ulang undangan
              </Button>
            )}
            {pengguna.statusAkun === 'nonaktif' ? (
              <Button variant="secondary" onClick={() => onStatus({ pengguna, aksi: 'aktifkan' })} aria-label={`Aktifkan ${pengguna.nama}`}>
                <Power className="size-4" aria-hidden /> Aktifkan kembali
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => onStatus({ pengguna, aksi: pengguna.statusAkun === 'diundang' ? 'batalkan' : 'nonaktifkan' })}
                aria-label={`${pengguna.statusAkun === 'diundang' ? 'Batalkan undangan' : 'Nonaktifkan'} ${pengguna.nama}`}
              >
                <PowerOff className="size-4" aria-hidden /> {pengguna.statusAkun === 'diundang' ? 'Batalkan undangan' : 'Nonaktifkan akun'}
              </Button>
            )}
          </div>
        </section>

        <section aria-labelledby="ubah-hapus" className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <h3 id="ubah-hapus" className="text-sm font-semibold text-red-800">
            Hapus pengguna
          </h3>
          <p className="text-sm text-red-800/90">Menghapus akun secara permanen. Tindakan ini tidak dapat dibatalkan.</p>
          <Button variant="danger" onClick={() => onHapus(pengguna)} aria-label={`Hapus ${pengguna.nama}`}>
            <Trash2 className="size-4" aria-hidden /> Hapus pengguna
          </Button>
        </section>
        </div>
      )}
    </Dialog>
  )
}
