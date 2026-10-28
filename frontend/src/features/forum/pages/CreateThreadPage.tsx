import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { Button, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useBuatThread, useKategoriForum } from '../api'
import { BATAS } from '../types'

interface FormValues {
  idKategori: string
  judul: string
  konten: string
}

const aria = (name: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${name}-error` : undefined,
})

export function CreateThreadPage() {
  const navigate = useNavigate()
  const kategori = useKategoriForum()
  const buat = useBuatThread()
  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { idKategori: '', judul: '', konten: '' },
  })

  const kirim = handleSubmit((v) =>
    buat.mutate(
      { idKategori: Number(v.idKategori), judul: v.judul.trim(), konten: v.konten.trim() },
      {
        onSuccess: (thread) => {
          toast.success('Thread berhasil dibuat.')
          navigate(`/forum/${thread.id}`)
        },
        onError: (err) => {
          // 422: tampilkan error per field dari server; isian tidak dibuang.
          if (err instanceof ApiError && err.status === 422) {
            for (const [field, message] of Object.entries(err.fieldErrors)) {
              setError(field as keyof FormValues, { message })
            }
          } else {
            toast.error(errorMessage(err))
          }
        },
      },
    ),
  )

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Buat Thread" description="Ajukan pertanyaan atau mulai diskusi dengan ASN dan akademisi lain." />
      <Card>
        <form onSubmit={kirim} noValidate className="space-y-5">
          <Field id="idKategori" label="Kategori" error={errors.idKategori?.message}>
            <select
              id="idKategori"
              className={inputClass}
              disabled={kategori.isPending}
              {...aria('idKategori', errors.idKategori?.message)}
              {...register('idKategori', { required: 'Pilih kategori.' })}
            >
              <option value="">Pilih kategori…</option>
              {kategori.data?.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="judul"
            label="Judul"
            error={errors.judul?.message}
            hint={`${BATAS.judulMin}–${BATAS.judulMax} karakter. Tulis singkat dan jelas.`}
          >
            <input
              id="judul"
              className={inputClass}
              {...aria('judul', errors.judul?.message)}
              {...register('judul', {
                validate: (v) => v.trim().length >= BATAS.judulMin || `Judul minimal ${BATAS.judulMin} karakter.`,
                maxLength: { value: BATAS.judulMax, message: `Judul maksimal ${BATAS.judulMax} karakter.` },
              })}
            />
          </Field>

          <Field
            id="konten"
            label="Isi diskusi"
            error={errors.konten?.message}
            hint={`${watch('konten').length}/${BATAS.kontenMax} karakter, minimal ${BATAS.kontenMin}.`}
          >
            <textarea
              id="konten"
              rows={10}
              className={inputClass}
              {...aria('konten', errors.konten?.message)}
              {...register('konten', {
                validate: (v) => v.trim().length >= BATAS.kontenMin || `Isi minimal ${BATAS.kontenMin} karakter.`,
                maxLength: { value: BATAS.kontenMax, message: `Isi maksimal ${BATAS.kontenMax} karakter.` },
              })}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Link to="/forum" className={buttonClass('secondary')}>
              Batal
            </Link>
            <Button type="submit" disabled={buat.isPending}>
              {buat.isPending ? 'Menyimpan…' : 'Terbitkan thread'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
