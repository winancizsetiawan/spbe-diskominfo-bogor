import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, inputClass } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { formatAngka, formatTanggalSingkat } from '@/lib/format'
import { useArtikel, useUbahArtikel, useVerifikasiArtikel } from '../api'
import { FORMAT_LABEL, JENIS_LABEL, STATUS_VERIFIKASI_ARTIKEL_LABEL, URL_LABEL } from '../types'

export function BeritaDetailPage() {
  const { id } = useParams()
  const numId = Number(id)
  const { user, can } = useAuth()
  const artikel = useArtikel(numId)
  const verifikasi = useVerifikasiArtikel()
  const ubah = useUbahArtikel(numId)

  const [catatanRevisi, setCatatanRevisi] = useState('')
  const [modeRevisi, setModeRevisi] = useState(false)
  const [modeEdit, setModeEdit] = useState(false)
  const [editJudul, setEditJudul] = useState('')
  const [editRingkasan, setEditRingkasan] = useState('')
  const [editKonten, setEditKonten] = useState('')

  if (artikel.isPending) return <Spinner className="py-16" />
  if (artikel.error instanceof ApiError && artikel.error.status === 401) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Tulisan ini khusus pengguna yang sudah masuk</h1>
        <p className="mt-1 text-sm text-slate-600">Masuk untuk membacanya.</p>
        <Link to="/masuk" className="mt-4 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
          Masuk
        </Link>
      </div>
    )
  }
  if (artikel.isError) return <ErrorState message={errorMessage(artikel.error)} onRetry={() => void artikel.refetch()} />
  const a = artikel.data
  const statusVerif = a.statusVerifikasi ?? 'terbit'
  const bisaVerifikasi = can('artikel:verifikasi')
  const adalahSuperAdmin = user?.role === 'super_admin'

  const bukaEdit = () => {
    setEditJudul(a.judul)
    setEditRingkasan(a.ringkasan)
    setEditKonten(a.konten)
    setModeEdit(true)
  }

  const putuskan = (keputusan: 'terbit' | 'revisi') => {
    if (keputusan === 'revisi' && catatanRevisi.trim().length < 5) {
      toast.error('Isi catatan revisi minimal 5 karakter.')
      return
    }
    verifikasi.mutate(
      { id: a.id, keputusan, catatan: catatanRevisi.trim() },
      {
        onSuccess: () => {
          toast.success(
            keputusan === 'terbit'
              ? 'Tulisan berhasil disetujui dan resmi diterbitkan.'
              : 'Tulisan dikembalikan ke Super Admin untuk direvisi.',
          )
          setModeRevisi(false)
          setCatatanRevisi('')
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  const simpanPerbaikan = () => {
    ubah.mutate(
      {
        jenis: a.jenis,
        judul: editJudul,
        format: a.format,
        urlSumber: a.urlSumber,
        penulis: a.penulis.split(',').map((s) => s.trim()).filter(Boolean),
        kolaborator: a.kolaborator,
        ringkasan: editRingkasan,
        konten: editKonten,
        kategori: a.kategori || 'Umum',
        label: a.label,
        tanggalTerbit: '',
        statusAkses: a.statusAkses,
        unggulan: a.unggulan,
      },
      {
        onSuccess: () => {
          toast.success('Perbaikan disimpan dan diajukan kembali ke Verifikator.')
          setModeEdit(false)
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    )
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/berita" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Kembali ke Berita & Artikel
        </Link>
        {bisaVerifikasi && (
          <Link to="/verifikasi-konten" className="text-sm font-semibold text-emerald-700 hover:underline">
            Ke Antrean Verifikasi Konten &rarr;
          </Link>
        )}
      </div>

      {a.catatanVerifikasi && (
        <div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Catatan Revisi dari Verifikator{a.diverifikasiOleh ? ` (${a.diverifikasiOleh})` : ''}:</p>
            <p>{a.catatanVerifikasi}</p>
          </div>
        </div>
      )}

      {bisaVerifikasi && statusVerif !== 'terbit' && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Panel Keputusan Verifikator</h2>
              <p className="text-xs text-slate-600">
                Periksa kelayakan isi berita/artikel sebelum diterbitkan ke publik.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => putuskan('terbit')} disabled={verifikasi.isPending}>
                <CheckCircle2 className="size-4" aria-hidden /> Setujui & Terbitkan
              </Button>
              <Button variant="secondary" onClick={() => setModeRevisi((v) => !v)} disabled={verifikasi.isPending}>
                <RotateCcw className="size-4" aria-hidden /> Minta Revisi
              </Button>
            </div>
          </div>

          {modeRevisi && (
            <div className="mt-4 space-y-3 border-t border-emerald-200 pt-4">
              <Field id="catatan-verifikasi" label="Catatan perbaikan untuk Super Admin">
                <textarea
                  id="catatan-verifikasi"
                  rows={3}
                  value={catatanRevisi}
                  onChange={(e) => setCatatanRevisi(e.target.value)}
                  placeholder="Tuliskan bagian yang perlu diperbaiki..."
                  className={inputClass}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModeRevisi(false)}>
                  Batal
                </Button>
                <Button variant="danger" onClick={() => putuskan('revisi')} disabled={verifikasi.isPending}>
                  Kirim Permintaan Revisi
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {adalahSuperAdmin && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={bukaEdit}>
            <Pencil className="size-4" aria-hidden /> Edit & Ajukan Ulang Verifikasi
          </Button>
        </div>
      )}

      {modeEdit ? (
        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">Perbaiki Berita / Artikel</h2>
          <Field id="edit-judul" label="Judul">
            <input id="edit-judul" value={editJudul} onChange={(e) => setEditJudul(e.target.value)} className={inputClass} />
          </Field>
          <Field id="edit-ringkasan" label="Ringkasan">
            <textarea id="edit-ringkasan" rows={2} value={editRingkasan} onChange={(e) => setEditRingkasan(e.target.value)} className={inputClass} />
          </Field>
          <Field id="edit-konten" label="Isi Konten">
            <textarea id="edit-konten" rows={6} value={editKonten} onChange={(e) => setEditKonten(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModeEdit(false)}>
              Batal
            </Button>
            <Button onClick={simpanPerbaikan} disabled={ubah.isPending}>
              {ubah.isPending ? 'Menyimpan…' : 'Simpan & Ajukan ke Verifikator'}
            </Button>
          </div>
        </Card>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={a.jenis === 'berita' ? 'brand' : 'neutral'}>{JENIS_LABEL[a.jenis]}</Badge>
            {(bisaVerifikasi || adalahSuperAdmin) && (
              <Badge tone={STATUS_VERIFIKASI_ARTIKEL_LABEL[statusVerif].tone}>
                {STATUS_VERIFIKASI_ARTIKEL_LABEL[statusVerif].label}
              </Badge>
            )}
            {a.format !== 'teks' && <Badge tone="neutral">{FORMAT_LABEL[a.format]}</Badge>}
            {a.kategori && <span className="text-sm text-slate-600">{a.kategori}</span>}
            {a.statusAkses === 'internal' && <Badge tone="neutral">Internal</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{a.judul}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatTanggalSingkat(a.tanggal)} · {a.penulis} · {formatAngka(a.views)} kali dibaca
          </p>
          {a.kolaborator.length > 0 && <p className="mt-1 text-sm text-slate-600">Kolaborator: {a.kolaborator.join(', ')}</p>}
          {a.urlSumber && (
            <a href={a.urlSumber} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
              {URL_LABEL[a.format]} <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          <div className="mt-6 space-y-4 text-slate-700">
            {a.konten.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {a.label.length > 0 && (
            <p className="mt-6 flex flex-wrap gap-1.5 text-xs text-slate-600">
              {a.label.map((l) => (
                <span key={l} className="rounded border border-slate-200 px-1.5 py-0.5">
                  #{l}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
