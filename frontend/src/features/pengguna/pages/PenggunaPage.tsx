import { Pencil, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ROLE_LABEL } from '@/auth/types'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonClass } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { waktuRelatif } from '@/lib/format'
import { useUrlFilter } from '@/lib/useUrlFilter'
import { useDaftarPengguna, useUndangUlang } from '../api'
import { HapusDialog } from '../components/HapusDialog'
import { StatusAkunDialog, type TargetStatus } from '../components/StatusAkunDialog'
import { UbahDialog } from '../components/UbahDialog'
import { UndangDialog } from '../components/UndangDialog'
import { STATUS_AKUN_LABEL, URUTAN_ROLE, type FilterRole, type Pengguna, type PenggunaFilter } from '../types'

const TAB: FilterRole[] = ['semua', ...URUTAN_ROLE]

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

// Tombol Ubah di tiap baris: ringkas, ikon + teks.
const aksi = buttonClass('secondary', 'h-8 gap-1.5 px-2.5 py-0 text-xs')

/** "Siti Rahma" -> "SR" untuk avatar. */
const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0].toUpperCase())
    .join('')

export function PenggunaPage() {
  const { user } = useAuth()
  const [params, ubahFilter] = useUrlFilter()
  const roleParam = params.get('role') as FilterRole | null
  const filter: PenggunaFilter = {
    page: Math.max(1, Number(params.get('page')) || 1),
    q: params.get('q') || undefined,
    role: roleParam && TAB.includes(roleParam) ? roleParam : 'semua',
  }
  const [q, setQ] = useState(filter.q ?? '')
  const daftar = useDaftarPengguna(filter)
  const undangUlang = useUndangUlang()

  const [undang, setUndang] = useState(false)
  const [diubah, setDiubah] = useState<Pengguna | null>(null)
  const [status, setStatus] = useState<TargetStatus | null>(null)
  const [dihapus, setDihapus] = useState<Pengguna | null>(null)

  const cari = (e: FormEvent) => {
    e.preventDefault()
    ubahFilter({ q: q.trim(), page: undefined })
  }

  const kirimUlang = (p: Pengguna) =>
    undangUlang.mutate(p.id, {
      onSuccess: () => toast.success(`Undangan dikirim ulang ke ${p.email}.`),
      onError: (err) => toast.error(errorMessage(err)),
    })

  return (
    <>
      <PageHeader
        title="Manajemen Pengguna"
        description="Undang pengguna, atur peran dan instansi, nonaktifkan atau hapus akun. Kata sandi dikelola di SSO."
        actions={
          <Button onClick={() => setUndang(true)}>
            <Plus className="size-4" aria-hidden /> Tambah Pengguna
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div role="group" aria-label="Filter peran" className="flex flex-wrap gap-2">
          {TAB.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={filter.role === t}
              className={chipClass(filter.role === t)}
              onClick={() => ubahFilter({ role: t === 'semua' ? undefined : t, page: undefined })}
            >
              {t === 'semua' ? 'Semua' : ROLE_LABEL[t]}
              {daftar.data && <span className="ml-1.5 opacity-75">{daftar.data.hitungan[t]}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={cari} role="search" className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
          <label htmlFor="cari-pengguna" className="sr-only">
            Cari nama, email, atau instansi
          </label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="cari-pengguna"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, email, instansi…"
            className={`${inputClass} pl-9`}
          />
        </form>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : daftar.data.items.length === 0 ? (
        <EmptyState title="Tidak ada pengguna yang cocok.">Ubah kata kunci atau pilih peran lain.</EmptyState>
      ) : (
        <div className={daftar.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table caption={`Daftar pengguna, ${daftar.data.total} data`}>
            <thead>
              <tr>
                <Th>Pengguna</Th>
                <Th>Instansi</Th>
                <Th>Peran</Th>
                <Th>Status</Th>
                <Th>Login terakhir</Th>
                <Th>
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {daftar.data.items.map((p) => {
                const sendiri = p.id === user?.id
                const st = STATUS_AKUN_LABEL[p.statusAkun]
                return (
                  <tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800">
                          {inisial(p.nama)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{p.nama}</p>
                          <p className="truncate text-xs text-slate-500">{p.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{p.instansi.nama}</Td>
                    <Td>
                      <Badge tone="brand">{ROLE_LABEL[p.role]}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {p.loginTerakhir ? waktuRelatif(p.loginTerakhir) : <span className="text-slate-500">Belum pernah</span>}
                    </Td>
                    <Td>
                      {sendiri ? (
                        // Mengubah atau menghapus akun sendiri diblokir agar Super Admin tidak mengunci dirinya.
                        <div className="flex justify-end">
                          <Badge tone="neutral">Akun Anda</Badge>
                        </div>
                      ) : (
                        // Satu tombol per baris; peran, akses akun, dan hapus diatur di dialog Ubah.
                        <div className="flex justify-end">
                          <button type="button" className={aksi} onClick={() => setDiubah(p)} aria-label={`Ubah ${p.nama}`}>
                            <Pencil className="size-3.5" aria-hidden /> Ubah
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <Pagination page={daftar.data.page} totalPages={daftar.data.totalPages} onChange={(page) => ubahFilter({ page })} />
        </div>
      )}

      <UndangDialog open={undang} onClose={() => setUndang(false)} />
      <UbahDialog
        pengguna={diubah}
        onClose={() => setDiubah(null)}
        onStatus={(t) => {
          setDiubah(null)
          setStatus(t)
        }}
        onHapus={(p) => {
          setDiubah(null)
          setDihapus(p)
        }}
        onKirimUlang={(p) => {
          setDiubah(null)
          kirimUlang(p)
        }}
        kirimUlangBerjalan={undangUlang.isPending}
      />
      <StatusAkunDialog target={status} onClose={() => setStatus(null)} />
      <HapusDialog pengguna={dihapus} onClose={() => setDihapus(null)} />
    </>
  )
}
