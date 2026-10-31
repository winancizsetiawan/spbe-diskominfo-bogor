import { Download, MessagesSquare } from 'lucide-react'
import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { Tabs } from '@/components/ui/Tabs'
import { errorMessage } from '@/lib/errors'
import { formatAngka } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useProfil } from '../api'
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
  const tab = (TAB.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'info') as TabKey

  if (!user) return null
  if (profil.isPending) return <Spinner className="py-24" />
  if (profil.isError) return <ErrorState message={errorMessage(profil.error)} onRetry={() => void profil.refetch()} />

  const p = profil.data

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="sr-only">Profil Saya</h1>
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-700 text-xl font-bold text-white">
            {inisial(p.nama)}
          </span>
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
