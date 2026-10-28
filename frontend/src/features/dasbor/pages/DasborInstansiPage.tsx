import { useAuth } from '@/auth/useAuth'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { useReferensiInstansi } from '@/features/katalog/api'
import { errorMessage } from '@/lib/errors'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDasborInstansi } from '../api'
import { EmbedFrame } from '../components/EmbedFrame'
import { PerbandinganInstansi } from '../components/PerbandinganInstansi'

/** Dasbor instansi: perbandingan native dengan agregat kota, lalu dasbor Metabase interaktif. */
export function DasborInstansiPage() {
  const { user } = useAuth()
  const superAdmin = user?.role === 'super_admin'
  const [params, ubahFilter] = useUrlFilter()
  // Admin OPD selalu instansinya sendiri; hanya Super Admin yang memilih (server menegakkan).
  const idInstansi = superAdmin ? Number(params.get('instansi')) || undefined : undefined
  const instansi = useReferensiInstansi(superAdmin)
  const dasbor = useDasborInstansi(idInstansi)

  return (
    <>
      <PageHeader
        title="Dasbor Instansi"
        description={superAdmin ? 'Pilih instansi untuk melihat kondisinya dibanding rata-rata kota.' : `Kondisi ${user?.instansi.nama} dibanding rata-rata kota.`}
        actions={
          superAdmin && (
            <div className="w-64">
              <label htmlFor="pilih-instansi" className="sr-only">
                Instansi
              </label>
              <select
                id="pilih-instansi"
                className={inputClass}
                value={idInstansi ?? dasbor.data?.instansi.id ?? ''}
                onChange={(e) => ubahFilter({ instansi: e.target.value })}
              >
                {instansi.data?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nama}
                  </option>
                ))}
              </select>
            </div>
          )
        }
      />

      <section aria-labelledby="judul-perbandingan" className="mb-10">
        <h2 id="judul-perbandingan" className="mb-3 text-lg font-semibold text-slate-900">
          Perbandingan dengan rata-rata kota
        </h2>
        {dasbor.isPending ? (
          <Spinner className="py-12" />
        ) : dasbor.isError ? (
          <ErrorState message={errorMessage(dasbor.error)} onRetry={() => void dasbor.refetch()} />
        ) : (
          <PerbandinganInstansi data={dasbor.data} />
        )}
      </section>

      <section aria-labelledby="judul-interaktif">
        <h2 id="judul-interaktif" className="mb-3 text-lg font-semibold text-slate-900">
          Dasbor interaktif
        </h2>
        {/* Instansi diteruskan hanya sebagai permintaan; filter yang berlaku dikunci server pada URL embed. */}
        <EmbedFrame jenis="instansi" judul="Dasbor interaktif instansi (Metabase)" idInstansi={idInstansi} />
      </section>
    </>
  )
}
