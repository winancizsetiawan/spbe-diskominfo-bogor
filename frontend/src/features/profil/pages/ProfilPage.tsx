import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Download, MessagesSquare, Trash2 } from 'lucide-react'
import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { Tabs } from '@/components/ui/Tabs'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { formatAngka } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useHapusFotoProfil, useProfil, useUnggahFotoProfil } from '../api'
import { AktivitasPanel } from '../components/AktivitasPanel'
import { InfoAkun } from '../components/InfoAkun'
import { PreferensiPanel } from '../components/PreferensiPanel'

type TabKey = 'info' | 'preferensi' | 'aktivitas'

const TAB: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Informasi Akun' },
  { key: 'preferensi', label: 'Preferensi' },
  { key: 'aktivitas', label: 'Riwayat Aktivitas' },
]

function inisial(nama: string) {
  // Gelar di belakang nama (mis. "S.T.") tidak dipakai sebagai inisial.
  const kata = nama.split(',')[0].trim().split(/\s+/)
  return (kata[0][0] + (kata.length > 1 ? kata[kata.length - 1][0] : '')).toUpperCase()
}

export function ProfilPage() {
  const { user } = useAuth()
  const [params, ubahFilter] = useUrlFilter()
  const profil = useProfil()
  const unggahFoto = useUnggahFotoProfil()
  const hapusFoto = useHapusFotoProfil()
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const [fotoGagalUrl, setFotoGagalUrl] = useState<string | null>(null)
  const tab = (TAB.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'info') as TabKey

  if (!user) return null
  if (profil.isPending) return <Spinner className="py-24" />
  if (profil.isError) return <ErrorState message={errorMessage(profil.error)} onRetry={() => void profil.refetch()} />

  const p = profil.data
  const tampilkanFoto = !!p.fotoProfil && p.fotoProfil !== fotoGagalUrl

  const pilihFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Foto profil harus berupa gambar PNG, JPG, atau WEBP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto profil maksimal 2 MB.')
      return
    }
    unggahFoto.mutate(file, {
      onSuccess: () => {
        setFotoGagalUrl(null)
        toast.success('Foto profil berhasil diperbarui.')
      },
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  const hapusFotoSekarang = () => {
    hapusFoto.mutate(undefined, {
      onSuccess: () => toast.success('Foto profil dihapus.'),
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="sr-only">Profil Saya</h1>
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative shrink-0">
              {tampilkanFoto ? (
                <img
                  src={p.fotoProfil!}
                  alt={`Foto profil ${p.nama}`}
                  onError={() => setFotoGagalUrl(p.fotoProfil ?? null)}
                  className="size-16 rounded-full object-cover ring-2 ring-brand-100"
                />
              ) : (
                <span aria-hidden className="grid size-16 place-items-center rounded-full bg-brand-700 text-xl font-bold text-white">
                  {inisial(p.nama)}
                </span>
              )}
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={unggahFoto.isPending}
                aria-label="Ubah foto profil"
                title="Ubah foto profil (PNG, JPG, WEBP maks. 2 MB)"
                className="absolute -right-1 -bottom-1 grid size-7 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-brand-700 disabled:opacity-50"
              >
                <Camera className="size-3.5" aria-hidden />
              </button>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={pilihFoto}
              />
            </div>
            {p.fotoProfil && (
              <button
                type="button"
                onClick={hapusFotoSekarang}
                disabled={hapusFoto.isPending}
                className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 disabled:opacity-50"
              >
                <Trash2 className="size-3" aria-hidden /> Hapus foto
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-slate-900">{p.nama}</p>
            <p className="mt-0.5 text-sm text-slate-600">{p.jabatan}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{ROLE_LABEL[p.role]}</Badge>
              <span className="text-sm text-slate-500">{p.instansi.nama}</span>
            </div>
          </div>
          <dl className="flex gap-6 rounded-xl bg-slate-50 px-5 py-3">
            <div className="text-center">
              <dt className="flex items-center justify-center gap-1 text-xs text-slate-500">
                <Download className="size-3.5" aria-hidden /> Dokumen diunduh
              </dt>
              <dd className="mt-1 text-xl font-bold text-slate-900">{formatAngka(p.statistik.dokumenDiunduh)}</dd>
            </div>
            <div className="text-center">
              <dt className="flex items-center justify-center gap-1 text-xs text-slate-500">
                <MessagesSquare className="size-3.5" aria-hidden /> Diskusi forum
              </dt>
              <dd className="mt-1 text-xl font-bold text-slate-900">{formatAngka(p.statistik.diskusiForum)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Tabs tabs={TAB} aktif={tab} onChange={(key) => ubahFilter({ tab: key === 'info' ? undefined : key })} label="Bagian profil">
        {tab === 'info' && <InfoAkun profil={p} user={user} />}
        {tab === 'preferensi' && <PreferensiPanel />}
        {tab === 'aktivitas' && <AktivitasPanel />}
      </Tabs>
    </div>
  )
}
