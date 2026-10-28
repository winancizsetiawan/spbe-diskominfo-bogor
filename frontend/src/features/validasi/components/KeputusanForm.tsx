import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useKeputusan } from '../api'
import { BATAS_KEPUTUSAN, KEPUTUSAN_INFO, type Keputusan } from '../types'

interface FormValues {
  keputusan: Keputusan | ''
  catatan: string
}

interface Props {
  pengajuanId: number
  namaAplikasi: string
  onSelesai(): void
}

export function KeputusanForm({ pengajuanId, namaAplikasi, onSelesai }: Props) {
  const putuskan = useKeputusan(pengajuanId)
  const [konfirmasi, setKonfirmasi] = useState<FormValues | null>(null)
  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { keputusan: '', catatan: '' },
  })
  const keputusan = watch('keputusan')
  const wajibCatatan = keputusan !== '' && KEPUTUSAN_INFO[keputusan].wajibCatatan

  const kirim = (v: FormValues) =>
    putuskan.mutate(
      { keputusan: v.keputusan as Keputusan, catatan: v.catatan.trim() },
      {
        onSuccess: () => {
          toast.success(`Keputusan untuk ${namaAplikasi} tersimpan: ${KEPUTUSAN_INFO[v.keputusan as Keputusan].label}.`)
          onSelesai()
        },
        onError: (err) => {
          setKonfirmasi(null)
          if (err instanceof ApiError && err.status === 409) {
            toast.error('Pengajuan ini sudah diputuskan. Halaman dimuat ulang.')
          } else if (err instanceof ApiError && err.status === 422) {
            for (const [field, message] of Object.entries(err.fieldErrors)) {
              setError(field === 'keputusan' ? 'keputusan' : 'catatan', { message })
            }
          } else {
            toast.error(errorMessage(err))
          }
        },
      },
    )

  // Menolak bersifat final, jadi diminta konfirmasi dulu.
  const submit = handleSubmit((v) => (v.keputusan === 'ditolak' ? setKonfirmasi(v) : kirim(v)))

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Keputusan</legend>
          <div className="space-y-2">
            {(Object.keys(KEPUTUSAN_INFO) as Keputusan[]).map((k) => (
              <label
                key={k}
                className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-checked:border-brand-500 has-checked:bg-brand-50"
              >
                <input
                  type="radio"
                  value={k}
                  className="mt-1"
                  aria-describedby={`keputusan-${k}-info`}
                  {...register('keputusan', { required: 'Pilih salah satu keputusan.' })}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{KEPUTUSAN_INFO[k].label}</span>
                  <span id={`keputusan-${k}-info`} className="block text-xs text-slate-500">
                    {KEPUTUSAN_INFO[k].keterangan}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors.keputusan && (
            <p role="alert" className="mt-1.5 text-sm text-red-600">
              {errors.keputusan.message}
            </p>
          )}
        </fieldset>

        <Field
          id="catatan"
          label={wajibCatatan ? 'Catatan untuk Admin OPD (wajib)' : 'Catatan (opsional)'}
          error={errors.catatan?.message}
          hint={wajibCatatan ? `${BATAS_KEPUTUSAN.catatanMin}–${BATAS_KEPUTUSAN.catatanMax} karakter. Jelaskan apa yang perlu diperbaiki.` : undefined}
        >
          <textarea
            id="catatan"
            rows={4}
            className={inputClass}
            aria-invalid={!!errors.catatan}
            aria-describedby={errors.catatan ? 'catatan-error' : undefined}
            {...register('catatan', {
              validate: (v) =>
                !wajibCatatan || v.trim().length >= BATAS_KEPUTUSAN.catatanMin || `Catatan minimal ${BATAS_KEPUTUSAN.catatanMin} karakter.`,
              maxLength: { value: BATAS_KEPUTUSAN.catatanMax, message: `Catatan maksimal ${BATAS_KEPUTUSAN.catatanMax} karakter.` },
            })}
          />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={putuskan.isPending}>
            {putuskan.isPending ? 'Menyimpan…' : 'Simpan keputusan'}
          </Button>
        </div>
      </form>

      <Dialog open={konfirmasi !== null} onClose={() => setKonfirmasi(null)} title="Tolak pengajuan?">
        <p className="text-sm text-slate-600">
          Penolakan bersifat final untuk pengajuan <span className="font-semibold">{namaAplikasi}</span>. Admin OPD perlu
          mengajukan ulang dari awal.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setKonfirmasi(null)}>
            Batal
          </Button>
          <Button variant="danger" disabled={putuskan.isPending} onClick={() => konfirmasi && kirim(konfirmasi)}>
            {putuskan.isPending ? 'Menyimpan…' : 'Ya, tolak'}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
