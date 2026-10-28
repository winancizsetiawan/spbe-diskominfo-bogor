import { Lock, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { isStatus } from '@/lib/errors'
import { useEmbedDasbor } from '../api'
import type { JenisDasbor } from '../types'

interface Props {
  jenis: JenisDasbor
  /** Judul untuk pembaca layar dan atribut title iframe. */
  judul: string
  idInstansi?: number
}

/**
 * Dasbor Metabase dalam iframe. URL embed berasal dari API, ditandatangani server dengan
 * filter yang dikunci (mis. instansi), dan berumur pendek. Portal tidak pernah membuat URL ini sendiri.
 */
export function EmbedFrame({ jenis, judul, idInstansi }: Props) {
  const embed = useEmbedDasbor(jenis, idInstansi)
  const [dimuat, setDimuat] = useState(false)
  const [kedaluwarsa, setKedaluwarsa] = useState(false)
  const url = embed.data?.url
  const batas = embed.data?.kedaluwarsa

  // URL baru berarti iframe baru: tampilkan loading lagi dan hapus penanda kedaluwarsa.
  useEffect(() => {
    setDimuat(false)
    setKedaluwarsa(false)
  }, [url])

  // Setelah URL berakhir, memuat ulang iframe dari server tidak lagi mungkin; minta URL baru.
  useEffect(() => {
    if (!batas) return
    const sisa = new Date(batas).getTime() - Date.now()
    if (sisa <= 0) return setKedaluwarsa(true)
    const timer = window.setTimeout(() => setKedaluwarsa(true), sisa)
    return () => window.clearTimeout(timer)
  }, [batas])

  if (embed.isPending) return <Spinner className="py-20" label="Menyiapkan dasbor…" />

  if (embed.isError) {
    const tidakBerhak = isStatus(embed.error, 403)
    return (
      <ErrorState
        message={
          tidakBerhak
            ? 'Peran Anda tidak memiliki akses ke dasbor ini.'
            : 'Dasbor sedang tidak tersedia. Portal lainnya tetap dapat digunakan; coba lagi sebentar lagi.'
        }
        onRetry={tidakBerhak ? undefined : () => void embed.refetch()}
      />
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Lock className="size-4" aria-hidden />
          {embed.data.filterTerkunci ? `Data difilter otomatis: ${embed.data.filterTerkunci}` : 'Menampilkan data teragregasi seluruh kota.'}
        </p>
        <Button variant="secondary" onClick={() => void embed.refetch()} disabled={embed.isFetching}>
          <RefreshCw className={`size-4 ${embed.isFetching ? 'animate-spin' : ''}`} aria-hidden /> Muat ulang dasbor
        </Button>
      </div>

      {kedaluwarsa && (
        <p role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Sesi dasbor telah berakhir. Muat ulang untuk melanjutkan.</span>
          <Button variant="secondary" onClick={() => void embed.refetch()}>
            Muat ulang
          </Button>
        </p>
      )}

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
        <iframe
          key={url}
          src={url}
          title={judul}
          sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
          referrerPolicy="no-referrer"
          onLoad={() => setDimuat(true)}
          className={`h-[640px] w-full ${kedaluwarsa ? 'opacity-40' : ''}`}
        />
        {!dimuat && (
          <div className="absolute inset-0 grid place-items-center bg-white/80">
            <Spinner label="Memuat dasbor…" />
          </div>
        )}
      </div>
    </div>
  )
}
