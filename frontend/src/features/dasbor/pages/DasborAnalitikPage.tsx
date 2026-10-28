import { PageHeader } from '@/components/ui/PageHeader'
import { EmbedFrame } from '../components/EmbedFrame'

/** Dasbor analitik lanjutan (Should): data teragregasi lintas instansi, tanpa data rinci per instansi lain. */
export function DasborAnalitikPage() {
  return (
    <>
      <PageHeader
        title="Dasbor Analitik"
        description="Visualisasi lanjutan SPBE Kota Bogor. Hanya tersedia bagi pengguna terverifikasi dan menampilkan data teragregasi."
      />
      <EmbedFrame jenis="analitik" judul="Dasbor analitik SPBE (Metabase)" />
    </>
  )
}
