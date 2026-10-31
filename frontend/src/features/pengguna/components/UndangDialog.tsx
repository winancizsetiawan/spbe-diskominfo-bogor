import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { ROLE_LABEL, type Role } from '@/auth/types'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useInstansiPengguna, useUndangPengguna } from '../api'
import { BATAS_PENGGUNA, instansiBolehUntuk, POLA_EMAIL, URUTAN_ROLE } from '../types'
import { InstansiSelect } from './InstansiSelect'

interface FormValues {
  nama: string
  email: string
  role: Role
  idInstansi: string
}

const KOSONG: FormValues = { nama: '', email: '', role: 'asn', idInstansi: '' }

const aria = (name: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${name}-error` : undefined,
})

export function UndangDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const instansi = useInstansiPengguna()
  const undang = useUndangPengguna()
  const { register, handleSubmit, reset, setError, watch, formState: { errors } } = useForm<FormValues>({ defaultValues: KOSONG })
  const role = watch('role')

  useEffect(() => {
    if (open) reset(KOSONG)
  }, [open, reset])

  const kirim = handleSubmit((v) =>
    undang.mutate(
      { nama: v.nama.trim(), email: v.email.trim(), role: v.role, idInstansi: Number(v.idInstansi) },
      {
        onSuccess: (p) => {
          toast.success(`Undangan dikirim ke ${p.email}.`)
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 422) {
            for (const [field, message] of Object.entries(err.fieldErrors)) setError(field as keyof FormValues, { message })
          } else {
            toast.error(errorMessage(err))
          }
        },
      },
    ),
  )

  return (
    <Dialog open={open} onClose={onClose} title="Tambah pengguna">
      <form onSubmit={kirim} noValidate className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Pengguna menerima undangan lewat email dan membuat akun di SSO Pemkot Bogor. Portal tidak menyimpan kata sandi.
        </p>

        <Field id="nama" label="Nama lengkap" error={errors.nama?.message}>
          <input
            id="nama"
            autoComplete="off"
            className={inputClass}
            {...aria('nama', errors.nama?.message)}
            {...register('nama', {
              validate: (v) => v.trim().length >= BATAS_PENGGUNA.namaMin || `Nama minimal ${BATAS_PENGGUNA.namaMin} karakter.`,
              maxLength: { value: BATAS_PENGGUNA.namaMax, message: `Nama maksimal ${BATAS_PENGGUNA.namaMax} karakter.` },
            })}
          />
        </Field>

        <Field id="email" label="Email" error={errors.email?.message} hint="Email kedinasan atau email institusi mitra.">
          <input
            id="email"
            type="email"
            autoComplete="off"
            className={inputClass}
            {...aria('email', errors.email?.message)}
            {...register('email', { validate: (v) => POLA_EMAIL.test(v.trim()) || 'Format email tidak valid.' })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="role" label="Peran" error={errors.role?.message}>
            <select id="role" className={inputClass} {...aria('role', errors.role?.message)} {...register('role')}>
              {URUTAN_ROLE.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>

          <Field id="idInstansi" label="Instansi" error={errors.idInstansi?.message}>
            <InstansiSelect
              id="idInstansi"
              instansi={instansi.data}
              role={role}
              {...aria('idInstansi', errors.idInstansi?.message)}
              {...register('idInstansi', {
                validate: (v) => {
                  if (!v) return 'Pilih instansi.'
                  const dipilih = instansi.data?.find((i) => i.id === Number(v))
                  return !dipilih || instansiBolehUntuk(role, dipilih) || 'Admin OPD harus berasal dari OPD.'
                },
              })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={undang.isPending}>
            {undang.isPending ? 'Mengirim…' : 'Kirim undangan'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
