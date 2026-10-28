import { Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarThread, useKategoriForum } from '../api'
import { ThreadCard } from '../components/ThreadCard'
import type { ThreadFilter } from '../types'

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function ForumListPage() {
  const [params, ubahFilter] = useUrlFilter()
  const filter: ThreadFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    kategori: Number(params.get('kategori')) || undefined,
    q: params.get('q') || undefined,
  }
  const [q, setQ] = useState(filter.q ?? '')
  const kategori = useKategoriForum()
  const daftar = useDaftarThread(filter)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim() || undefined, page: undefined })
  }

  return (
    <>
      <PageHeader
        title="Forum Diskusi"
        description="Berdiskusi dan berbagi pengetahuan seputar implementasi SPBE."
        actions={
          <Link to="/forum/baru" className={buttonClass('primary')}>
            <Plus className="size-4" aria-hidden /> Buat Thread
          </Link>
        }
      />

      <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={cari} role="search" className="relative">
          <label htmlFor="cari-forum" className="sr-only">
            Cari diskusi
          </label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-forum"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari diskusi… (tekan Enter)"
            className={`${inputClass} pl-9`}
          />
        </form>
        <div role="group" aria-label="Filter kategori" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!filter.kategori}
            className={chipClass(!filter.kategori)}
            onClick={() => ubahFilter({ kategori: undefined, page: undefined })}
          >
            Semua
          </button>
          {kategori.data?.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={filter.kategori === k.id}
              className={chipClass(filter.kategori === k.id)}
              onClick={() => ubahFilter({ kategori: String(k.id), page: undefined })}
            >
              {k.nama}
            </button>
          ))}
        </div>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Belum ada diskusi yang cocok.">
          {filter.q || filter.kategori ? 'Coba kata kunci atau kategori lain.' : 'Jadilah yang pertama membuat thread.'}
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">
            {daftar.data.total} thread diskusi
          </p>
          <ul className={`space-y-3 transition-opacity ${daftar.isPlaceholderData ? 'opacity-60' : ''}`}>
            {daftar.data.items.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </ul>
          <Pagination
            page={daftar.data.page}
            totalPages={daftar.data.totalPages}
            onChange={(page) => ubahFilter({ page: String(page) })}
          />
        </>
      )}
    </>
  )
}
