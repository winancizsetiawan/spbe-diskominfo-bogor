import { useId } from 'react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { usePreferensi, useUbahPreferensi } from '../api'

interface SaklarProps {
  label: string
  keterangan: string
  nyala: boolean
  onChange?(nyala: boolean): void
  nonaktif?: boolean
}

/** Saklar aksesibel: checkbox bersemantik switch, bisa dioperasikan dengan spasi. */
function Saklar({ label, keterangan, nyala, onChange, nonaktif = false }: SaklarProps) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-slate-900">
          {label}
        </label>
        <p id={`${id}-info`} className="mt-0.5 text-sm text-slate-500">
          {keterangan}
        </p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={nyala}
        disabled={nonaktif}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-describedby={`${id}-info`}
        className="relative mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-white before:transition checked:bg-brand-600 checked:before:translate-x-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  )
}

export function PreferensiPanel() {
  const preferensi = usePreferensi()
  const ubah = useUbahPreferensi()

  if (preferensi.isPending) return <Spinner className="py-10" />
  if (preferensi.isError) return <ErrorState message={errorMessage(preferensi.error)} onRetry={() => void preferensi.refetch()} />

  return (
    <Card className="divide-y divide-slate-100 py-1">
      <Saklar
        label="Notifikasi di portal"
        keterangan="Selalu aktif. Notifikasi muncul di ikon lonceng dan halaman Notifikasi."
        nyala
        nonaktif
      />
      <Saklar
        label="Notifikasi email"
        keterangan="Kirim ringkasan notifikasi penting ke email kedinasan Anda."
        nyala={preferensi.data.kanalEmail}
        onChange={(kanalEmail) =>
          ubah.mutate(
            { kanalEmail },
            {
              onSuccess: () => toast.success(`Notifikasi email ${kanalEmail ? 'diaktifkan' : 'dimatikan'}.`),
              onError: (err) => toast.error(errorMessage(err)),
            },
          )
        }
      />
      <p className="py-4 text-xs text-slate-500">Notifikasi push belum tersedia.</p>
    </Card>
  )
}
