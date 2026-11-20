import { AlertTriangle, KeyRound } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useUbahSandi } from '../api'

interface FormValues {
  sandiLama: string
  sandiBaru: string
  konfirmasiSandi: string
}

interface Props {
  open: boolean
  wajib?: boolean
  onClose(): void
}

export function UbahSandiDialog({ open, wajib = false, onClose }: Props) {
  const { logout } = useAuth()
  const ubah = useUbahSandi()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { sandiLama: '', sandiBaru: '', konfirmasiSandi: '' },
  })

  const sandiBaru = watch('sandiBaru')
  const sandiLama = watch('sandiLama')

  useEffect(() => {
    if (open) reset({ sandiLama: '', sandiBaru: '', konfirmasiSandi: '' })
  }, [open, reset])

  const kirim = handleSubmit((v) => {
    ubah.mutate(v, {
      onSuccess: () => {
        toast.success('Kata sandi berhasil diperbarui. Masa aktif kata sandi diperpanjang 365 hari.')
        onClose()
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) {
          for (const [k, msg] of Object.entries(err.fieldErrors)) {
            setError(k as keyof FormValues, { message: msg })
          }
        } else {
          toast.error(errorMessage(err))
        }
      },
    })
  })

  return (
    <Dialog
      open={open}
      onClose={wajib ? () => {} : onClose}
      title={wajib ? 'Wajib Perbarui Kata Sandi (Kebijakan Tahunan)' : 'Ubah Kata Sandi'}
    >
      <form onSubmit={kirim} noValidate className="space-y-4">
        {wajib && (
          <div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
            <div>
              <p className="font-semibold">Kata sandi Anda telah berusia lebih dari 1 tahun (365 hari).</p>
              <p className="mt-0.5 text-amber-800">
                Sesuai kebijakan keamanan Arsitektur Pemerintah Digital Kota Bogor, Anda wajib mengganti kata sandi sebelum melanjutkan akses ke portal.
              </p>
            </div>
          </div>
        )}

        <Field id="sandi-lama" label="Kata sandi saat ini" error={errors.sandiLama?.message}>
          <input
            id="sandi-lama"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            aria-invalid={!!errors.sandiLama}
            {...register('sandiLama', { required: 'Kata sandi saat ini wajib diisi.' })}
          />
        </Field>

        <Field
          id="sandi-baru"
          label="Kata sandi baru"
          hint="Minimal 8 karakter dan tidak boleh sama dengan kata sandi lama."
          error={errors.sandiBaru?.message}
        >
          <input
            id="sandi-baru"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            aria-invalid={!!errors.sandiBaru}
            {...register('sandiBaru', {
              required: 'Kata sandi baru wajib diisi.',
              minLength: { value: 8, message: 'Kata sandi baru minimal 8 karakter.' },
              validate: (v) => v !== sandiLama || 'Kata sandi baru tidak boleh sama dengan kata sandi lama.',
            })}
          />
        </Field>

        <Field id="konfirmasi-sandi" label="Konfirmasi kata sandi baru" error={errors.konfirmasiSandi?.message}>
          <input
            id="konfirmasi-sandi"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            aria-invalid={!!errors.konfirmasiSandi}
            {...register('konfirmasiSandi', {
              required: 'Konfirmasi kata sandi wajib diisi.',
              validate: (v) => v === sandiBaru || 'Konfirmasi kata sandi tidak cocok.',
            })}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          {wajib ? (
            <Button variant="secondary" onClick={logout}>
              Keluar
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
          )}
          <Button type="submit" disabled={ubah.isPending}>
            <KeyRound className="size-4" aria-hidden />
            {ubah.isPending ? 'Menyimpan…' : 'Simpan Kata Sandi Baru'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
