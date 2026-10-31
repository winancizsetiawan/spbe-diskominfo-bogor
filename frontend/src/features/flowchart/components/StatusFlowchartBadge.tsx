import { Badge } from '@/components/ui/Badge'
import type { StatusValidasi } from '@/features/katalog/types'
import { STATUS_FLOWCHART_LABEL } from '../types'

const TONE: Record<StatusValidasi, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  menunggu: 'brand',
  disetujui: 'success',
  perlu_revisi: 'warning',
  ditolak: 'danger',
}

/** Sama dengan status validasi lain, kecuali "Disetujui" yang tampil sebagai "Dipublikasikan" (K6). */
export function StatusFlowchartBadge({ status }: { status: StatusValidasi }) {
  return <Badge tone={TONE[status]}>{STATUS_FLOWCHART_LABEL[status]}</Badge>
}
