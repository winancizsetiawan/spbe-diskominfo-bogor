import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useBuatArtikel } from '../api'
import { BATAS_ARTIKEL, JENIS_LABEL, type JenisArtikel } from '../types'

interface FormValues {
  judul: string
  ringkasan: string
  penulis: string
  konten: string
}

const aria = (name: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${name}-error` : undefined,
})

interface Props {
  open: boolean
  jenis: JenisArtikel
  onClose(): void
}

/** Super Admin menerbitkan berita atau artikel. Isi berupa teks polos; paragraf dipisah baris kosong. */
export function TambahTulisanDialog({ open, jenis, onClose }: Props) {
  const { user } = useAuth()
  const buat = useBuatArtikel()
  const penulisAwal = user?.instansi.nama ?? ''
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>({
    defaultValues: { judul: '', ringkasan: '', penulis: penulisAwal, konten: '' },
  })

  useEffect(() => {
    if (open) reset({ judul: '', ringkasan: '', penulis: penulisAwal, konten: '' })
  }, [open, penulisAwal, reset])

  const label = JENIS_LABEL[jenis]

  const kirim = handleSubmit((v) =>
    buat.mutate(
      { jenis, judul: v.judul.trim(), ringkasan: v.ringkasan.trim(), penulis: v.penulis.trim(), konten: v.konten.trim() },
      {
        onSuccess: () => {
          toast.success(`${label} berhasil diterbitkan.`)
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
    <Dialog open={open} onClose={onClose} title={`Tambah ${label.toLowerCase()}`}>
      <form onSubmit={kirim} noValidate className="space-y-4">
        <Field id="judul" label="Judul" error={errors.judul?.message}>
          <input
            id="judul"
            autoComplete="off"
            className={inputClass}
            {...aria('judul', errors.judul?.message)}
            {...register('judul', {
              validate: (v) => v.trim().length >= BATAS_ARTIKEL.judulMin || `Judul minimal ${BATAS_ARTIKEL.judulMin} karakter.`,
              maxLength: { value: BATAS_ARTIKEL.judulMax, message: `Judul maksimal ${BATAS_ARTIKEL.judulMax} karakter.` },
            })}
          />
        </Field>

        <Field id="ringkasan" label="Ringkasan" error={errors.ringkasan?.message} hint="Satu atau dua kalimat yang tampil di daftar.">
          <textarea
            id="ringkasan"
            rows={2}
            className={inputClass}
            {...aria('ringkasan', errors.ringkasan?.message)}
            {...register('ringkasan', {
              validate: (v) => v.trim().length >= BATAS_ARTIKEL.ringkasanMin || `Ringkasan minimal ${BATAS_ARTIKEL.ringkasanMin} karakter.`,
              maxLength: { value: BATAS_ARTIKEL.ringkasanMax, message: `Ringkasan maksimal ${BATAS_ARTIKEL.ringkasanMax} karakter.` },
            })}
          />
        </Field>

        <Field id="penulis" label="Penulis" error={errors.penulis?.message}>
          <input
            id="penulis"
            autoComplete="off"
            className={inputClass}
            {...aria('penulis', errors.penulis?.message)}
            {...register('penulis', {
              validate: (v) => v.trim().length >= BATAS_ARTIKEL.penulisMin || `Penulis minimal ${BATAS_ARTIKEL.penulisMin} karakter.`,
              maxLength: { value: BATAS_ARTIKEL.penulisMax, message: `Penulis maksimal ${BATAS_ARTIKEL.penulisMax} karakter.` },
            })}
          />
        </Field>

        <Field id="konten" label="Isi" error={errors.konten?.message} hint="Teks polos. Pisahkan paragraf dengan satu baris kosong.">
          <textarea
            id="konten"
            rows={8}
            className={inputClass}
            {...aria('konten', errors.konten?.message)}
            {...register('konten', { validate: (v) => v.trim().length >= BATAS_ARTIKEL.kontenMin || `Isi minimal ${BATAS_ARTIKEL.kontenMin} karakter.` })}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={buat.isPending}>
            {buat.isPending ? 'Menyimpan…' : `Terbitkan ${label.toLowerCase()}`}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
