import { Button } from '@/components/ui/Button'
import type { FaseUnggah } from '../unggah'

const TEKS: Record<Exclude<FaseUnggah, 'diam'>, string> = {
  menyiapkan: 'Menyiapkan unggahan…',
  mengunggah: 'Mengunggah berkas',
  menyimpan: 'Menyimpan dokumen…',
}

interface Props {
  fase: Exclude<FaseUnggah, 'diam'>
  persen: number
  onBatal(): void
}

export function UploadProgress({ fase, persen, onBatal }: Props) {
  const menentukan = fase === 'mengunggah'
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-4" aria-live="polite">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-brand-800">
          {TEKS[fase]}
          {menentukan && ` ${persen}%`}
        </span>
        {/* Setelah berkas terkirim, menyimpan metadata tidak dapat dibatalkan dengan aman. */}
        {fase !== 'menyimpan' && (
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onBatal}>
            Batalkan
          </Button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Progres unggahan"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={menentukan ? persen : undefined}
        className="h-2 overflow-hidden rounded-full bg-brand-100"
      >
        <div
          className={`h-full rounded-full bg-brand-600 transition-[width] ${menentukan ? '' : 'w-1/3 animate-pulse'}`}
          style={menentukan ? { width: `${persen}%` } : undefined}
        />
      </div>
    </div>
  )
}
