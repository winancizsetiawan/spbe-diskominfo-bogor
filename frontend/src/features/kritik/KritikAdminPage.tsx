import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { errorMessage } from '@/lib/errors'
import { formatTanggal } from '@/lib/format'
import { useDaftarKritik } from './kritik'

export function KritikAdminPage() {
  const kritik = useDaftarKritik()

  return (
    <>
      <PageHeader title="Kritik & Saran" description="Masukan yang dikirim lewat formulir publik." />
      {kritik.isPending ? (
        <Spinner className="py-16" />
      ) : kritik.isError ? (
        <ErrorState message={errorMessage(kritik.error)} onRetry={() => void kritik.refetch()} />
      ) : kritik.data.length === 0 ? (
        <EmptyState title="Belum ada masukan." />
      ) : (
        <Table caption={`Kritik dan saran, ${kritik.data.length} data`}>
          <thead>
            <tr>
              <Th>Waktu</Th>
              <Th>Pengirim</Th>
              <Th>Pesan</Th>
            </tr>
          </thead>
          <tbody>
            {kritik.data.map((k) => (
              <tr key={k.id}>
                <Td className="whitespace-nowrap text-slate-600">{formatTanggal(k.dibuatPada)}</Td>
                <Td>
                  <p className="font-semibold text-slate-900">{k.nama}</p>
                  <p className="text-xs text-slate-500">{k.email}</p>
                </Td>
                <Td className="text-slate-700">{k.pesan}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
