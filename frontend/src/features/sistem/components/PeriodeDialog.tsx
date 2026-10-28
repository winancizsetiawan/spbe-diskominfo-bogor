import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useSimpanPeriode } from '../api'
import { BATAS_PERIODE, validasiPeriode, type Periode, type PeriodeInput } from '../types'

export interface TargetPeriode {
  /** Null berarti periode baru. */
  periode: Periode | null
}

interface Props {
  target: TargetPeriode | null
  semua: Periode[]
  onClose(): void
}

export function PeriodeDialog({ target, semua, onClose }: Props) {
  const simpan = useSimpanPeriode()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PeriodeInput>()
  const ubah = target?.periode ?? null

  useEffect(() => {
    if (target) reset({ nama: ubah?.nama ?? '', tanggalMulai: ubah?.tanggalMulai ?? '', tenggat: ubah?.tenggat ?? '' })
  }, [target, ubah, reset])

  const kirim = handleSubmit((v) => {
    // Pemeriksaan cepat di klien; server tetap menjadi penentu dan dapat membalas 422.
    const salah = validasiPeriode(v, semua.filter((p) => p.id !== ubah?.id))
    const kunci = Object.keys(salah) as (keyof PeriodeInput)[]
    if (kunci.length > 0) {
      for (const k of kunci) setError(k, { message: salah[k] })
      return
    }
    simpan.mutate(
      { ...v, nama: v.nama.trim(), id: ubah?.id },
      {
        onSuccess: () => {
          toast.success(ubah ? 'Periode diperbarui.' : 'Periode disimpan. Pengingat H-7, H-3, dan H-1 dijadwalkan otomatis.')
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 422) {
            for (const [field, message] of Object.entries(err.fieldErrors)) setError(field as keyof PeriodeInput, { message })
          } else {
            toast.error(errorMessage(err))
            if (err instanceof ApiError && err.status === 409) onClose()
          }
        },
      },
    )
  })

  return (
    <Dialog open={target !== null} onClose={onClose} title={ubah ? 'Ubah periode pembaruan' : 'Tambah periode pembaruan'}>
      {target && (
        <form onSubmit={kirim} noValidate className="space-y-4">
          <Field id="periode-nama" label="Nama periode" error={errors.nama?.message} hint="Contoh: Triwulan IV 2026">
            <input
              id="periode-nama"
              className={inputClass}
              maxLength={BATAS_PERIODE.namaMax}
              aria-invalid={!!errors.nama}
              aria-describedby={errors.nama ? 'periode-nama-error' : undefined}
              {...register('nama')}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="periode-mulai" label="Tanggal mulai" error={errors.tanggalMulai?.message}>
              <input
                id="periode-mulai"
                type="date"
                className={inputClass}
                aria-invalid={!!errors.tanggalMulai}
                aria-describedby={errors.tanggalMulai ? 'periode-mulai-error' : undefined}
                {...register('tanggalMulai')}
              />
            </Field>
            <Field id="periode-tenggat" label="Tenggat" error={errors.tenggat?.message}>
              <input
                id="periode-tenggat"
                type="date"
                className={inputClass}
                aria-invalid={!!errors.tenggat}
                aria-describedby={errors.tenggat ? 'periode-tenggat-error' : undefined}
                {...register('tenggat')}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Admin OPD yang datanya belum berstatus Disetujui menerima pengingat otomatis pada H-7, H-3, dan H-1 sebelum tenggat.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={simpan.isPending}>
              {simpan.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
