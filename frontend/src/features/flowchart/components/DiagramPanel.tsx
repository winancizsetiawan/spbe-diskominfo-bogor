import { lazy, Suspense } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { useFlowchart } from '../api'

// bpmn-js berukuran besar: hanya diunduh saat ada halaman yang benar-benar menampilkan diagram.
const BpmnViewer = lazy(() => import('./BpmnViewer'))

/** Diagram sebuah flowchart. Dipakai halaman detail flowchart dan halaman tinjau validasi. */
export function DiagramPanel({ id }: { id: number }) {
  const flowchart = useFlowchart(id)

  if (flowchart.isPending) return <Spinner className="py-20" label="Memuat diagram…" />
  if (flowchart.isError) return <ErrorState message={errorMessage(flowchart.error)} onRetry={() => void flowchart.refetch()} />

  const f = flowchart.data
  return (
    <Suspense fallback={<Spinner className="py-20" label="Memuat penampil diagram…" />}>
      <BpmnViewer xml={f.bpmnXml} nama={f.nama} namaBerkas={`${f.kode}-v${f.versi}`} />
    </Suspense>
  )
}
