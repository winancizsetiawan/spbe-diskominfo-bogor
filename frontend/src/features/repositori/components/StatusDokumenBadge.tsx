import { Badge } from '@/components/ui/Badge'
import { STATUS_LABEL, type StatusDokumen } from '@/features/dokumen/types'

const TONE: Record<StatusDokumen, 'neutral' | 'warning' | 'success' | 'brand'> = {
  draft: 'neutral',
  review: 'warning',
  berlaku: 'success',
  arsip: 'brand',
}

export function StatusDokumenBadge({ status }: { status: StatusDokumen }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>
}
