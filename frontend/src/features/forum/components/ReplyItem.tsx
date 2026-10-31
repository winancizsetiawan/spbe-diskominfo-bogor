import { Flag, ThumbsUp } from 'lucide-react'
import { formatTanggal, waktuRelatif } from '@/lib/format'
import type { Balasan } from '../types'

interface Props {
  balasan: Balasan
  /** false bila thread terkunci/tersembunyi: tombol nilai dan laporkan dinonaktifkan. */
  interaktif: boolean
  onNilai(): void
  onLaporkan(): void
}

export function ReplyItem({ balasan, interaktif, onNilai, onLaporkan }: Props) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-800">{balasan.penulis.nama}</span> · {balasan.penulis.instansi} ·{' '}
        <time dateTime={balasan.dibuatPada} title={formatTanggal(balasan.dibuatPada)}>
          {waktuRelatif(balasan.dibuatPada)}
        </time>
      </p>
      {/* Konten pengguna dirender sebagai teks biasa (di-escape React), bukan HTML. */}
      <p className="mt-3 text-sm whitespace-pre-line text-slate-700">{balasan.konten}</p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onNilai}
          disabled={!interaktif}
          aria-pressed={balasan.sudahDinilai}
          aria-label={`${balasan.sudahDinilai ? 'Batalkan nilai' : 'Beri nilai'} balasan (${balasan.jumlahNilai})`}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-brand-50 aria-pressed:text-brand-700"
        >
          <ThumbsUp className="size-4" aria-hidden />
          {balasan.jumlahNilai}
        </button>
        <button
          type="button"
          onClick={onLaporkan}
          disabled={!interaktif}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Flag className="size-4" aria-hidden />
          Laporkan
        </button>
      </div>
    </li>
  )
}
