import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useUbahProfil } from '../api'
import { normalisasiTelepon, POLA_TELEPON } from '../types'

interface Props {
  open: boolean
  noTelepon: string | null
  onClose(): void
}

export function TeleponDialog({ open, noTelepon, onClose }: Props) {
  const ubah = useUbahProfil()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<{ noTelepon: string }>({
    defaultValues: { noTelepon: noTelepon ?? '' },
  })

  useEffect(() => {
    if (open) reset({ noTelepon: noTelepon ?? '' })
  }, [open, noTelepon, reset])

  const kirim = handleSubmit(({ noTelepon: nilai }) =>
    ubah.mutate(
      { noTelepon: normalisasiTelepon(nilai) || null },
      {
        onSuccess: () => {
          toast.success('Profil diperbarui.')
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.fieldErrors.noTelepon) setError('noTelepon', { message: err.fieldErrors.noTelepon })
          else toast.error(errorMessage(err))
        },
      },
    ),
  )

  return (
    <Dialog open={open} onClose={onClose} title="Ubah nomor telepon">
      <form onSubmit={kirim} noValidate className="space-y-4">
        <Field
          id="telepon"
          label="Nomor telepon / WhatsApp"
          error={errors.noTelepon?.message}
          hint="Opsional. Kosongkan untuk menghapus. Contoh: 081234567890."
        >
          <input
            id="telepon"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={inputClass}
            aria-invalid={!!errors.noTelepon}
            aria-describedby={errors.noTelepon ? 'telepon-error' : undefined}
            {...register('noTelepon', {
              validate: (v) => {
                const bersih = normalisasiTelepon(v)
                return !bersih || POLA_TELEPON.test(bersih) || 'Gunakan nomor seluler Indonesia, mis. 081234567890.'
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
    </Dialog>
  )
}
