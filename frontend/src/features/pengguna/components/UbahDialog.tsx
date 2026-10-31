import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { ROLE_LABEL, type Role } from '@/auth/types'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useInstansiPengguna, useUbahPengguna } from '../api'
import { instansiBolehUntuk, URUTAN_ROLE, type Pengguna } from '../types'
import { InstansiSelect } from './InstansiSelect'

interface FormValues {
  role: Role
  idInstansi: string
}

export function UbahDialog({ pengguna, onClose }: { pengguna: Pengguna | null; onClose(): void }) {
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
    <Dialog open={pengguna !== null} onClose={onClose} title="Ubah peran dan instansi">
      {pengguna && (
        <form onSubmit={kirim} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{pengguna.nama}</span> · {pengguna.email}
          </p>

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
              {ubah.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
