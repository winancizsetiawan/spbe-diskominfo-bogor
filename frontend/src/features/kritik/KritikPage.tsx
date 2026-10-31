import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { POLA_EMAIL } from '@/features/pengguna/types'
import { BATAS_KRITIK, useKirimKritik, type KritikInput } from './kritik'

export function KritikPage() {
  const kirim = useKirimKritik()
  const [terkirim, setTerkirim] = useState(false)
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<KritikInput>()

  const submit = handleSubmit((v) =>
    kirim.mutate(v, {
      onSuccess: () => {
        reset()
        setTerkirim(true)
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) {
          for (const [f, message] of Object.entries(err.fieldErrors)) setError(f as keyof KritikInput, { message })
        } else toast.error(errorMessage(err))
      },
    }),
  )

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Kritik & Saran" description="Sampaikan masukan untuk perbaikan portal. Data Anda hanya dibaca pengelola portal." />
      {terkirim && (
        <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Terima kasih, masukan Anda sudah diterima.
        </p>
      )}
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="kritik-nama" label="Nama" error={errors.nama?.message}>
          <input id="kritik-nama" className={inputClass} maxLength={BATAS_KRITIK.namaMax} aria-invalid={!!errors.nama} {...register('nama', { required: 'Isi nama.', minLength: { value: BATAS_KRITIK.namaMin, message: `Minimal ${BATAS_KRITIK.namaMin} karakter.` } })} />
        </Field>
        <Field id="kritik-email" label="Email" error={errors.email?.message}>
          <input id="kritik-email" type="email" className={inputClass} aria-invalid={!!errors.email} {...register('email', { required: 'Isi email.', pattern: { value: POLA_EMAIL, message: 'Format email tidak valid.' } })} />
        </Field>
        <Field id="kritik-pesan" label="Pesan" error={errors.pesan?.message} hint={`${BATAS_KRITIK.pesanMin}–${BATAS_KRITIK.pesanMax} karakter`}>
          <textarea id="kritik-pesan" rows={5} className={inputClass} maxLength={BATAS_KRITIK.pesanMax} aria-invalid={!!errors.pesan} {...register('pesan', { required: 'Isi pesan.', minLength: { value: BATAS_KRITIK.pesanMin, message: `Minimal ${BATAS_KRITIK.pesanMin} karakter.` } })} />
        </Field>
        <Button type="submit" disabled={kirim.isPending}>
          {kirim.isPending ? 'Mengirim…' : 'Kirim'}
        </Button>
      </form>
    </div>
  )
}
