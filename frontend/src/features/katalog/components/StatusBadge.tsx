import { Badge } from '@/components/ui/Badge'
import type { StatusRaa, StatusValidasi } from '../types'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

export const STATUS_VALIDASI: Record<StatusValidasi, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  menunggu: { label: 'Menunggu', tone: 'brand' },
  disetujui: { label: 'Disetujui', tone: 'success' },
  perlu_revisi: { label: 'Perlu Revisi', tone: 'warning' },
  ditolak: { label: 'Ditolak', tone: 'danger' },
}

export const STATUS_RAA: Record<StatusRaa, { label: string; tone: Tone }> = {
  sesuai: { label: 'Sesuai', tone: 'success' },
  perlu_penyesuaian: { label: 'Perlu Penyesuaian', tone: 'warning' },
  belum: { label: 'Belum Sesuai', tone: 'danger' },
}

export function StatusValidasiBadge({ status }: { status: StatusValidasi }) {
  const { label, tone } = STATUS_VALIDASI[status]
  return <Badge tone={tone}>{label}</Badge>
}

export function StatusRaaBadge({ status }: { status: StatusRaa }) {
  const { label, tone } = STATUS_RAA[status]
  return <Badge tone={tone}>{label}</Badge>
}
