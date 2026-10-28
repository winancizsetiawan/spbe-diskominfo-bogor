import type { ReactNode } from 'react'
import { Card } from './Card'

type Tone = 'neutral' | 'success' | 'warning' | 'danger'

const TONE: Record<Tone, string> = {
  neutral: 'text-slate-900',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
}

interface Props {
  label: string
  value: ReactNode
  hint?: string
  tone?: Tone
}

export function StatCard({ label, value, hint, tone = 'neutral' }: Props) {
  return (
    <Card>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${TONE[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}
