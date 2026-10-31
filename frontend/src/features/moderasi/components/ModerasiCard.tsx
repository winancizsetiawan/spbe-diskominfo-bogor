import { EyeOff, Flag, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { waktuRelatif } from '@/lib/format'
import type { ItemModerasi, StatusLaporan, Tindakan } from '../types'

const LAPORAN_TONE: Record<StatusLaporan, { label: string; tone: 'danger' | 'success' | 'neutral' }> = {
  baru: { label: 'Baru', tone: 'danger' },
  ditindak: { label: 'Ditindak', tone: 'success' },
  ditolak: { label: 'Ditolak', tone: 'neutral' },
}

interface Props {
  item: ItemModerasi
  onTindak(tindakan: Tindakan): void
}

export function ModerasiCard({ item, onTindak }: Props) {
  const [lengkap, setLengkap] = useState(false)
  const adalahThread = item.targetTipe === 'thread'
  const tersembunyi = item.status === 'tersembunyi'
  const bisaDikunci = adalahThread && item.status === 'aktif'
  const nama = adalahThread ? item.judulThread : `balasan oleh ${item.penulis.nama}`

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{adalahThread ? 'Thread' : 'Balasan'}</Badge>
        <Badge>{item.kategori}</Badge>
        {item.status === 'terkunci' && (
          <Badge tone="warning">
            <Lock className="size-3" aria-hidden /> Terkunci
          </Badge>
        )}
        {tersembunyi && (
          <Badge tone="danger">
            <EyeOff className="size-3" aria-hidden /> Tersembunyi
          </Badge>
        )}
        {item.laporanBaru > 0 && (
          <Badge tone="danger">
            <Flag className="size-3" aria-hidden /> {item.laporanBaru} laporan baru
          </Badge>
        )}
      </div>

      <h2 className="font-semibold text-slate-900">
        {tersembunyi ? (
          item.judulThread
        ) : (
          <Link to={`/forum/${item.threadId}`} className="hover:text-brand-700">
            {item.judulThread}
          </Link>
        )}
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        {adalahThread ? 'Dibuat oleh' : 'Balasan oleh'} <span className="font-medium text-slate-700">{item.penulis.nama}</span> ·{' '}
        {item.penulis.instansi} · {waktuRelatif(item.dibuatPada)}
      </p>

      {/* Konten pengguna dirender sebagai teks biasa (di-escape React). */}
      <p className={`mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-700 ${lengkap ? '' : 'line-clamp-3'}`}>
        {item.konten}
      </p>
      {item.konten.length > 180 && (
        <button type="button" onClick={() => setLengkap((v) => !v)} className="mt-1 text-xs font-medium text-brand-700 hover:underline">
          {lengkap ? 'Ringkas' : 'Selengkapnya'}
        </button>
      )}

      {item.laporan.length > 0 && (
        <section aria-label={`Laporan untuk ${nama}`} className="mt-4">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Laporan ({item.laporan.length})</h3>
          <ul className="max-h-44 space-y-2 overflow-y-auto">
            {item.laporan.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-800">{l.alasan}</p>
                  <p className="text-xs text-slate-500">
                    {l.pelapor} · {waktuRelatif(l.dibuatPada)}
                  </p>
                </div>
                <Badge tone={LAPORAN_TONE[l.status].tone}>{LAPORAN_TONE[l.status].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        {tersembunyi ? (
          <p className="text-sm text-slate-500">Konten ini sudah disembunyikan.</p>
        ) : (
          <>
            {item.laporanBaru > 0 && (
              <Button variant="secondary" onClick={() => onTindak('abaikan')} aria-label={`Abaikan laporan untuk ${nama}`}>
                Abaikan laporan
              </Button>
            )}
            {bisaDikunci && (
              <Button variant="secondary" onClick={() => onTindak('kunci')} aria-label={`Kunci ${nama}`}>
                <Lock className="size-4" aria-hidden /> Kunci thread
              </Button>
            )}
            <Button variant="danger" onClick={() => onTindak('sembunyikan')} aria-label={`Sembunyikan ${nama}`}>
              <EyeOff className="size-4" aria-hidden /> Sembunyikan
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
