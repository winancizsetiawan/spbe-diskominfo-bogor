import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { ApiError } from '@/api/client'
import { errorMessage } from '@/lib/errors'
import { useLaporkan } from '../api'
import { BATAS, type LaporanInput } from '../types'

interface Props {
  target: Pick<LaporanInput, 'targetTipe' | 'targetId'> | null
  onClose(): void
}

export function ReportDialog({ target, onClose }: Props) {
  const laporkan = useLaporkan()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<{ alasan: string }>({
    defaultValues: { alasan: '' },
  })

  useEffect(() => {
    if (target) reset({ alasan: '' })
  }, [target, reset])

  const kirim = handleSubmit(({ alasan }) => {
    if (!target) return
    laporkan.mutate(
      { ...target, alasan: alasan.trim() },
      {
        onSuccess: () => {
          toast.success('Laporan terkirim. Terima kasih, Super Admin akan meninjaunya.')
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiError && err.fieldErrors.alasan) setError('alasan', { message: err.fieldErrors.alasan })
          else toast.error(errorMessage(err))
        },
      },
    )
  })

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={target?.targetTipe === 'balasan' ? 'Laporkan balasan' : 'Laporkan thread'}
    >
      <form onSubmit={kirim} noValidate className="space-y-4">
        <Field id="alasan-laporan" label="Alasan" error={errors.alasan?.message} hint={`Minimal ${BATAS.alasanMin} karakter.`}>
          <textarea
            id="alasan-laporan"
            rows={4}
            className={inputClass}
            aria-invalid={!!errors.alasan}
            aria-describedby={errors.alasan ? 'alasan-laporan-error' : undefined}
            {...register('alasan', {
              validate: (v) =>
                v.trim().length >= BATAS.alasanMin || `Alasan minimal ${BATAS.alasanMin} karakter.`,
              maxLength: { value: BATAS.alasanMax, message: `Alasan maksimal ${BATAS.alasanMax} karakter.` },
            })}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="danger" disabled={laporkan.isPending}>
            {laporkan.isPending ? 'Mengirim…' : 'Kirim laporan'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
