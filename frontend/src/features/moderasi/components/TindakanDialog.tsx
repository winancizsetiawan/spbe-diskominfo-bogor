import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useTindakan } from '../api'
import { BATAS_TINDAKAN, TINDAKAN_INFO, type ItemModerasi, type Tindakan } from '../types'

export interface TargetTindakan {
  item: ItemModerasi
  tindakan: Tindakan
}

interface Props {
  target: TargetTindakan | null
  onClose(): void
}

const SELESAI: Record<Tindakan, string> = {
  abaikan: 'Laporan diabaikan.',
  kunci: 'Thread dikunci.',
  sembunyikan: 'Konten disembunyikan.',
}

export function TindakanDialog({ target, onClose }: Props) {
  const tindak = useTindakan()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<{ alasan: string }>({
    defaultValues: { alasan: '' },
  })

  useEffect(() => {
    if (target) reset({ alasan: '' })
  }, [target, reset])

  const info = target ? TINDAKAN_INFO[target.tindakan] : null

  const kirim = handleSubmit(({ alasan }) => {
    if (!target) return
    tindak.mutate(
      {
        targetTipe: target.item.targetTipe,
        targetId: target.item.targetId,
        tindakan: target.tindakan,
        alasan: info?.wajibAlasan ? alasan.trim() : undefined,
      },
      {
        onSuccess: () => {
          toast.success(SELESAI[target.tindakan])
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.error('Item ini sudah ditindak. Daftar dimuat ulang.')
            onClose()
          } else if (err instanceof ApiError && err.status === 422 && err.fieldErrors.alasan) {
            setError('alasan', { message: err.fieldErrors.alasan })
          } else {
            toast.error(errorMessage(err))
            onClose()
          }
        },
      },
    )
  })

  return (
    <Dialog open={target !== null} onClose={onClose} title={info?.judul ?? ''}>
      {target && info && (
        <form onSubmit={kirim} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{target.item.judulThread}</span>
            {target.item.targetTipe === 'balasan' && ` (balasan oleh ${target.item.penulis.nama})`}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{info.keterangan}</p>

          {info.wajibAlasan && (
            <Field
              id="alasan-moderasi"
              label="Alasan (dikirim ke pembuat konten)"
              error={errors.alasan?.message}
              hint={`${BATAS_TINDAKAN.alasanMin}–${BATAS_TINDAKAN.alasanMax} karakter.`}
            >
              <textarea
                id="alasan-moderasi"
                rows={3}
                className={inputClass}
                aria-invalid={!!errors.alasan}
                aria-describedby={errors.alasan ? 'alasan-moderasi-error' : undefined}
                {...register('alasan', {
                  validate: (v) => v.trim().length >= BATAS_TINDAKAN.alasanMin || `Alasan minimal ${BATAS_TINDAKAN.alasanMin} karakter.`,
                  maxLength: { value: BATAS_TINDAKAN.alasanMax, message: `Alasan maksimal ${BATAS_TINDAKAN.alasanMax} karakter.` },
                })}
              />
            </Field>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant={target.tindakan === 'sembunyikan' ? 'danger' : 'primary'} disabled={tindak.isPending}>
              {tindak.isPending ? 'Menyimpan…' : target.tindakan === 'sembunyikan' ? 'Ya, sembunyikan' : info.tombol}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
