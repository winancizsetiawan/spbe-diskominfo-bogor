import { Download } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useUnduh } from '../api'

interface Props {
  id: number
  judul: string
  /** Tombol kecil (ikon saja) untuk baris daftar. */
  ringkas?: boolean
}

/** Sequence Diagram 7: minta URL berumur pendek ke API, lalu buka sebagai unduhan. */
export function UnduhButton({ id, judul, ringkas = false }: Props) {
  const navigate = useNavigate()
  const unduh = useUnduh(id)

  const klik = () =>
    unduh.mutate(undefined, {
      onSuccess: ({ url, namaBerkas }) => {
        // Server menyajikan berkas sebagai lampiran; anchor sementara memicu unduhan tanpa meninggalkan halaman.
        const a = document.createElement('a')
        a.href = url
        a.download = namaBerkas
        a.rel = 'noopener'
        document.body.append(a)
        a.click()
        a.remove()
        toast.success(`Mengunduh ${namaBerkas}`)
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 401) {
          // Dokumen internal dan belum login: ke halaman masuk, lalu kembali ke dokumen ini.
          navigate(`/masuk?kembali=${encodeURIComponent(`/dokumen/${id}`)}`)
        } else if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          toast.error('Dokumen ini tidak tersedia untuk Anda.')
        } else {
          toast.error(errorMessage(err))
        }
      },
    })

  if (ringkas) {
    return (
      <button
        type="button"
        onClick={klik}
        disabled={unduh.isPending}
        aria-label={`Unduh ${judul}`}
        className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        <Download className="size-4" aria-hidden />
      </button>
    )
  }

  return (
    <Button onClick={klik} disabled={unduh.isPending}>
      <Download className="size-4" aria-hidden />
      {unduh.isPending ? 'Menyiapkan…' : 'Unduh'}
    </Button>
  )
}
