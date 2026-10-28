import { Eye, Lock, MessageSquare } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { formatAngka, waktuRelatif } from '@/lib/format'
import type { ThreadRingkas } from '../types'

export function ThreadCard({ thread }: { thread: ThreadRingkas }) {
  return (
    <li>
      <Link
        to={`/forum/${thread.id}`}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{thread.kategori.nama}</Badge>
            {thread.status === 'terkunci' && (
              <Badge tone="warning">
                <Lock className="size-3" aria-hidden /> Terkunci
              </Badge>
            )}
          </div>
          <h2 className="truncate text-base font-semibold text-slate-900">{thread.judul}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {thread.penulis.nama} · {thread.penulis.instansi} · {waktuRelatif(thread.dibuatPada)}
          </p>
        </div>
        <dl className="flex shrink-0 gap-5 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <dt>
              <MessageSquare className="size-4" aria-hidden />
              <span className="sr-only">Balasan</span>
            </dt>
            <dd>{formatAngka(thread.jumlahBalasan)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt>
              <Eye className="size-4" aria-hidden />
              <span className="sr-only">Dilihat</span>
            </dt>
            <dd>{formatAngka(thread.dilihat)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  )
}
