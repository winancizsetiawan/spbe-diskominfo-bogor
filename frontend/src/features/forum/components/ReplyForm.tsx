import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useBalas } from '../api'
import { BATAS } from '../types'

export function ReplyForm({ threadId }: { threadId: number }) {
  const balas = useBalas(threadId)
  const { register, handleSubmit, reset, setError, watch, formState: { errors } } = useForm<{ konten: string }>({
    defaultValues: { konten: '' },
  })
  const panjang = watch('konten').length

  const kirim = handleSubmit(({ konten }) =>
    balas.mutate(konten.trim(), {
      onSuccess: () => {
        reset()
        toast.success('Balasan terkirim.')
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) toast.error('Thread ini baru saja dikunci, balasan tidak terkirim.')
        else if (err instanceof ApiError && err.fieldErrors.konten) setError('konten', { message: err.fieldErrors.konten })
        else toast.error(errorMessage(err))
      },
    }),
  )

  return (
    <form onSubmit={kirim} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <Field id="balasan" label="Tulis balasan" error={errors.konten?.message} hint={`${panjang}/${BATAS.balasanMax} karakter`}>
        <textarea
          id="balasan"
          rows={4}
          className={inputClass}
          aria-invalid={!!errors.konten}
          aria-describedby={errors.konten ? 'balasan-error' : undefined}
          {...register('konten', {
            validate: (v) => v.trim().length > 0 || 'Balasan tidak boleh kosong.',
            maxLength: { value: BATAS.balasanMax, message: `Balasan maksimal ${BATAS.balasanMax} karakter.` },
          })}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={balas.isPending}>
          {balas.isPending ? 'Mengirim…' : 'Kirim balasan'}
        </Button>
      </div>
    </form>
  )
}
