import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useInstansiProfil, useUbahDataPegawai } from '../api'
import type { ProfilSaya, UbahDataPegawaiInput } from '../types'

interface Props {
  open: boolean
  profil: ProfilSaya
  onClose(): void
}

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function DataPegawaiDialog({ open, profil, onClose }: Props) {
  const ubah = useUbahDataPegawai()
  const instansiQuery = useInstansiProfil(open)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UbahDataPegawaiInput>({
    defaultValues: {
      nama: profil.nama,
      nip: profil.nip,
      idInstansi: profil.instansi.id,
      satkerInduk: profil.satkerInduk,
      jabatan: profil.jabatan,
      golongan: profil.golongan,
      email: profil.email,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        nama: profil.nama,
        nip: profil.nip,
        idInstansi: profil.instansi.id,
        satkerInduk: profil.satkerInduk,
        jabatan: profil.jabatan,
        golongan: profil.golongan,
        email: profil.email,
      })
    }
  }, [open, profil, reset])

  const daftarInstansi = instansiQuery.data?.length
    ? instansiQuery.data
    : [{ id: profil.instansi.id, nama: profil.instansi.nama }]

  const kirim = handleSubmit((data) =>
    ubah.mutate(
      {
        ...data,
        nama: data.nama.trim(),
        nip: data.nip.trim(),
        idInstansi: Number(data.idInstansi),
        satkerInduk: data.satkerInduk.trim(),
        jabatan: data.jabatan.trim(),
        golongan: data.golongan.trim(),
        email: data.email.trim().toLowerCase(),
      },
      {
        onSuccess: () => {
          toast.success('Data pegawai berhasil diperbarui.')
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
            for (const [k, v] of Object.entries(err.fieldErrors)) {
              setError(k as keyof UbahDataPegawaiInput, { message: v })
            }
          } else if (err instanceof ApiError && err.status === 404) {
            toast.error('Endpoint ubah data pegawai belum aktif. Restart backend Go (go run ./cmd/api) lalu coba lagi.')
          } else {
            toast.error(errorMessage(err))
          }
        },
      },
    ),
  )

  return (
    <Dialog open={open} onClose={onClose} title="Ubah data pegawai">
      <form onSubmit={kirim} noValidate className="space-y-3.5">
        <Field id="pegawai-nama" label="Nama lengkap" error={errors.nama?.message}>
          <input
            id="pegawai-nama"
            type="text"
            className={inputClass}
            aria-invalid={!!errors.nama}
            {...register('nama', {
              validate: (v) => v.trim().length > 0 || 'Nama lengkap wajib diisi.',
              maxLength: { value: 150, message: 'Maksimal 150 karakter.' },
            })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field id="pegawai-nip" label="NIP" error={errors.nip?.message}>
            <input
              id="pegawai-nip"
              type="text"
              className={`${inputClass} font-mono`}
              aria-invalid={!!errors.nip}
              {...register('nip', {
                validate: (v) => v.trim().length > 0 || 'NIP wajib diisi.',
                maxLength: { value: 50, message: 'Maksimal 50 karakter.' },
              })}
            />
          </Field>

          <Field id="pegawai-golongan" label="Golongan" error={errors.golongan?.message}>
            <input
              id="pegawai-golongan"
              type="text"
              className={inputClass}
              aria-invalid={!!errors.golongan}
              {...register('golongan', {
                validate: (v) => v.trim().length > 0 || 'Golongan wajib diisi.',
                maxLength: { value: 50, message: 'Maksimal 50 karakter.' },
              })}
            />
          </Field>
        </div>

        <Field id="pegawai-instansi" label="Instansi" error={errors.idInstansi?.message}>
          <select
            id="pegawai-instansi"
            className={inputClass}
            aria-invalid={!!errors.idInstansi}
            {...register('idInstansi', {
              valueAsNumber: true,
              validate: (v) => v > 0 || 'Instansi wajib dipilih.',
            })}
          >
            {daftarInstansi.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.nama}
              </option>
            ))}
          </select>
        </Field>

        <Field id="pegawai-satker" label="Satuan kerja induk" error={errors.satkerInduk?.message}>
          <input
            id="pegawai-satker"
            type="text"
            className={inputClass}
            aria-invalid={!!errors.satkerInduk}
            {...register('satkerInduk', {
              validate: (v) => v.trim().length > 0 || 'Satuan kerja induk wajib diisi.',
              maxLength: { value: 150, message: 'Maksimal 150 karakter.' },
            })}
          />
        </Field>

        <Field id="pegawai-jabatan" label="Jabatan" error={errors.jabatan?.message}>
          <input
            id="pegawai-jabatan"
            type="text"
            className={inputClass}
            aria-invalid={!!errors.jabatan}
            {...register('jabatan', {
              validate: (v) => v.trim().length > 0 || 'Jabatan wajib diisi.',
              maxLength: { value: 100, message: 'Maksimal 100 karakter.' },
            })}
          />
        </Field>

        <Field id="pegawai-email" label="Email kedinasan" error={errors.email?.message}>
          <input
            id="pegawai-email"
            type="email"
            className={inputClass}
            aria-invalid={!!errors.email}
            {...register('email', {
              validate: (v) => {
                const bersih = v.trim()
                if (!bersih) return 'Email kedinasan wajib diisi.'
                return POLA_EMAIL.test(bersih) || 'Format email kedinasan tidak valid.'
              },
              maxLength: { value: 150, message: 'Maksimal 150 karakter.' },
            })}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
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
