import { CheckCircle2, Eye, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonClass } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { formatTanggalSingkat } from '@/lib/format'
import { useDaftarVerifikasiArtikel, useVerifikasiArtikel } from '../api'
import {
  JENIS_LABEL,
  STATUS_VERIFIKASI_ARTIKEL_LABEL,
  type ArtikelDetail,
  type StatusVerifikasiArtikel,
} from '../types'

type FilterStatus = 'semua' | StatusVerifikasiArtikel

const chipClass = (aktif: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${aktif ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`

export function VerifikasiKontenPage() {
  const daftar = useDaftarVerifikasiArtikel()
  const verifikasi = useVerifikasiArtikel()
  const [filter, setFilter] = useState<FilterStatus>('semua')
  const [targetRevisi, setTargetRevisi] = useState<ArtikelDetail | null>(null)
  const [catatan, setCatatan] = useState('')

  const setujui = (a: ArtikelDetail) => {
    verifikasi.mutate(
      { id: a.id, keputusan: 'terbit' },
      {
        onSuccess: () => toast.success(`"${a.judul}" disetujui dan resmi diterbitkan.`),
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  const kirimRevisi = () => {
    if (!targetRevisi) return
    if (catatan.trim().length < 5) {
      toast.error('Catatan revisi minimal 5 karakter.')
      return
    }
    verifikasi.mutate(
      { id: targetRevisi.id, keputusan: 'revisi', catatan: catatan.trim() },
      {
        onSuccess: () => {
          toast.success(`"${targetRevisi.judul}" dikembalikan ke Super Admin untuk direvisi.`)
          setTargetRevisi(null)
          setCatatan('')
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  const ringkasan = daftar.data?.ringkasan
  const items = (daftar.data?.items ?? []).filter((a) => {
    const st = a.statusVerifikasi ?? 'terbit'
    return filter === 'semua' || st === filter
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifikasi Berita & Artikel"
        description="Tinjau dan setujui berita serta artikel edukasi yang diajukan oleh Super Admin sebelum tampil ke publik."
      />

      <section aria-label="Ringkasan verifikasi konten" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Menunggu verifikasi"
          value={ringkasan?.menunggu ?? '–'}
          tone={(ringkasan?.menunggu ?? 0) > 0 ? 'warning' : 'neutral'}
          hint="Perlu ditinjau Verifikator"
        />
        <StatCard
          label="Sudah diterbitkan"
          value={ringkasan?.terbit ?? '–'}
          tone="success"
          hint="Tampil di halaman Berita & Artikel"
        />
        <StatCard
          label="Perlu revisi"
          value={ringkasan?.revisi ?? '–'}
          tone={(ringkasan?.revisi ?? 0) > 0 ? 'danger' : 'neutral'}
          hint="Menunggu perbaikan Super Admin"
        />
      </section>

      <div role="group" aria-label="Filter status verifikasi" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <button type="button" aria-pressed={filter === 'semua'} className={chipClass(filter === 'semua')} onClick={() => setFilter('semua')}>
          Semua
        </button>
        <button type="button" aria-pressed={filter === 'menunggu'} className={chipClass(filter === 'menunggu')} onClick={() => setFilter('menunggu')}>
          Menunggu Verifikasi ({ringkasan?.menunggu ?? 0})
        </button>
        <button type="button" aria-pressed={filter === 'revisi'} className={chipClass(filter === 'revisi')} onClick={() => setFilter('revisi')}>
          Perlu Revisi ({ringkasan?.revisi ?? 0})
        </button>
        <button type="button" aria-pressed={filter === 'terbit'} className={chipClass(filter === 'terbit')} onClick={() => setFilter('terbit')}>
          Diterbitkan ({ringkasan?.terbit ?? 0})
        </button>
      </div>

      {daftar.isPending ? (
        <Spinner className="py-16" />
      ) : daftar.isError ? (
        <ErrorState message={errorMessage(daftar.error)} onRetry={() => void daftar.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Tidak ada tulisan pada filter ini." />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const st = a.statusVerifikasi ?? 'terbit'
            const infoSt = STATUS_VERIFIKASI_ARTIKEL_LABEL[st]
            return (
              <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={a.jenis === 'berita' ? 'brand' : 'neutral'}>{JENIS_LABEL[a.jenis]}</Badge>
                      <Badge tone={infoSt.tone}>{infoSt.label}</Badge>
                      <span className="text-xs text-slate-500">
                        {formatTanggalSingkat(a.tanggal)} · {a.penulis}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">{a.judul}</h2>
                    <p className="text-sm text-slate-600">{a.ringkasan}</p>
                    {a.catatanVerifikasi && (
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <span className="font-semibold">Catatan Revisi:</span> {a.catatanVerifikasi}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/berita/${a.id}`} className={buttonClass('secondary')}>
                      <Eye className="size-4" aria-hidden /> Baca Lengkap
                    </Link>
                    {st !== 'terbit' && (
                      <>
                        <Button onClick={() => setujui(a)} disabled={verifikasi.isPending}>
                          <CheckCircle2 className="size-4" aria-hidden /> Setujui & Terbitkan
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setTargetRevisi(a)
                            setCatatan(a.catatanVerifikasi ?? '')
                          }}
                          disabled={verifikasi.isPending}
                        >
                          <RotateCcw className="size-4" aria-hidden /> Minta Revisi
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={targetRevisi !== null} onClose={() => setTargetRevisi(null)} title="Minta Revisi Berita / Artikel">
        {targetRevisi && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tulisan: <span className="font-semibold text-slate-900">{targetRevisi.judul}</span>
            </p>
            <Field id="dialog-catatan-revisi" label="Catatan perbaikan untuk Super Admin" hint="Minimal 5 karakter.">
              <textarea
                id="dialog-catatan-revisi"
                rows={4}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Jelaskan bagian yang perlu diperbaiki oleh Super Admin..."
                className={inputClass}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTargetRevisi(null)}>
                Batal
              </Button>
              <Button variant="danger" onClick={kirimRevisi} disabled={verifikasi.isPending}>
                {verifikasi.isPending ? 'Mengirim…' : 'Kirim Permintaan Revisi'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
