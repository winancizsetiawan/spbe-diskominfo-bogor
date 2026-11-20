import { Info, Search, Wand2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { inputClass } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { errorMessage, isStatus } from '@/lib/errors'
import { useProbisArsitektur, useRantaiArsitektur } from '../api'
import { bangunBpmnOtomatis, type PilihanRantai } from '../bpmnOtomatis'
import type { ItemArsitektur, ProbisArsitektur, RantaiArsitektur } from '../types'

interface Props {
  /** Nama instansi pengguna; dipakai sebagai saringan OPD awal bila ada di data arsitektur. */
  instansi?: string
  disabled?: boolean
  /** Dipanggil saat proses bisnis dipilih (sekali per pilihan), untuk mengisi informasi proses. */
  onPilihProbis(p: ProbisArsitektur): void
  /** Dipanggil setiap pilihan berubah dengan diagram BPMN hasil susunan dan isi rantai yang dicentang. */
  onDiagram(xml: string, pilihan: PilihanRantai): void
}

const SEMUA = ''
const norm = (s: string) => s.trim().toLowerCase()

type Domain = 'data' | 'aplikasi' | 'layanan' | 'infrastruktur'
const DOMAIN: { kunci: Domain; label: string; sumber: string }[] = [
  { kunci: 'data', label: 'Data', sumber: '5-Domain Data' },
  { kunci: 'aplikasi', label: 'Aplikasi', sumber: '6-Domain Aplikasi' },
  { kunci: 'layanan', label: 'Layanan', sumber: '4-Domain Layanan' },
  { kunci: 'infrastruktur', label: 'Infrastruktur', sumber: '7-Domain Infrastruktur' },
]

/**
 * Pilih proses bisnis dari Excel matriks arsitektur (sheet 1-7); data, aplikasi, layanan, dan infrastruktur
 * yang terkait langsung dicentang dan diagram alurnya disusun otomatis di lembar gambar.
 */
export function SusunOtomatis({ instansi, disabled = false, onPilihProbis, onDiagram }: Props) {
  const idDasar = useId()
  const daftar = useProbisArsitektur()
  const [opd, setOpd] = useState<string | null>(null)
  const [cari, setCari] = useState('')
  const [idProbis, setIdProbis] = useState<string>()
  const rantai = useRantaiArsitektur(idProbis)
  const [buang, setBuang] = useState<Set<string>>(new Set())

  const daftarOpd = useMemo(() => [...new Set((daftar.data ?? []).map((p) => p.unit).filter(Boolean))].sort(), [daftar.data])
  // Saringan awal: OPD pengguna bila namanya ada di Excel.
  const opdAktif = opd ?? daftarOpd.find((u) => instansi && norm(u) === norm(instansi)) ?? SEMUA
  const kandidat = useMemo(() => {
    const q = norm(cari)
    return (daftar.data ?? []).filter(
      (p) => (opdAktif === SEMUA || p.unit === opdAktif) && (!q || norm(p.nama).includes(q) || norm(p.id).includes(q)),
    )
  }, [daftar.data, opdAktif, cari])

  // Susun ulang diagram setiap rantai atau centangan berubah.
  const data = rantai.data
  useEffect(() => {
    if (!data || data.prosesBisnis.id !== idProbis) return
    const pilihan = saringRantai(data, buang)
    onDiagram(bangunBpmnOtomatis(pilihan), pilihan)
    // onDiagram sengaja tidak menjadi dependensi: cukup bereaksi pada perubahan pilihan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, buang, idProbis])

  const pilih = (id: string) => {
    setIdProbis(id || undefined)
    setBuang(new Set())
    const p = daftar.data?.find((x) => x.id === id)
    if (p) onPilihProbis(p)
  }

  const ubahCentang = (id: string, nyala: boolean) =>
    setBuang((b) => {
      const baru = new Set(b)
      if (nyala) baru.delete(id)
      else baru.add(id)
      return baru
    })

  if (daftar.isPending) return <Spinner className="py-10" label="Memuat data arsitektur…" />
  if (daftar.isError) {
    return (
      <Card className="space-y-1">
        <h2 className="font-semibold text-slate-900">Susun otomatis dari data arsitektur</h2>
        <p className="text-sm text-slate-600">
          {isStatus(daftar.error, 404)
            ? 'Data arsitektur belum tersedia. Super Admin perlu mengunggah Excel matriks arsitektur di Dasbor Analitik. Sementara itu, diagram tetap bisa digambar manual di bawah.'
            : errorMessage(daftar.error)}
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Wand2 className="size-4 text-brand-700" aria-hidden /> Susun otomatis dari data arsitektur
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Pilih proses bisnis. Data, aplikasi, layanan, dan infrastruktur yang terkait diambil dari Excel matriks arsitektur (sheet 1–7), lalu
          diagramnya langsung disusun di lembar gambar.
        </p>
      </div>

      <fieldset disabled={disabled} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div>
          <label htmlFor={`${idDasar}-opd`} className="mb-1.5 block text-sm font-medium text-slate-700">
            OPD
          </label>
          <select id={`${idDasar}-opd`} className={inputClass} value={opdAktif} onChange={(e) => setOpd(e.target.value)}>
            <option value={SEMUA}>Semua OPD</option>
            {daftarOpd.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idDasar}-cari`} className="mb-1.5 block text-sm font-medium text-slate-700">
            Cari proses bisnis
          </label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id={`${idDasar}-cari`}
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Nama atau ID proses bisnis…"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${idDasar}-probis`} className="mb-1.5 block text-sm font-medium text-slate-700">
            Proses bisnis <span className="font-normal text-slate-500">({kandidat.length} pilihan)</span>
          </label>
          <select id={`${idDasar}-probis`} className={inputClass} value={idProbis ?? ''} onChange={(e) => pilih(e.target.value)}>
            <option value="">Pilih proses bisnis…</option>
            {kandidat.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} · {p.jenis || 'Proses bisnis'} ({p.id})
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {idProbis && rantai.isPending && <Spinner className="py-6" label="Menyusun keterkaitan…" />}
      {rantai.isError && <p className="text-sm text-red-600">{errorMessage(rantai.error)}</p>}
      {data && data.prosesBisnis.id === idProbis && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">{data.prosesBisnis.unit}</span>
            {data.prosesBisnis.statusBpmnAsIs && <> · BPMN As-Is: {data.prosesBisnis.statusBpmnAsIs}</>}
            {data.prosesBisnis.statusBpmnToBe && <> · BPMN To-Be: {data.prosesBisnis.statusBpmnToBe}</>}
          </p>
          {data.dasarData === 'kode' && (
            <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Kolom Kode Referensi Data di Excel belum diisi untuk proses bisnis ini, jadi data dipilih dari kesamaan kode. Hapus centang yang
              tidak sesuai; diagram langsung menyesuaikan.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAIN.map((d) => (
              <DaftarCentang
                key={d.kunci}
                judul={d.label}
                sumber={d.sumber}
                items={data[d.kunci]}
                buang={buang}
                onChange={ubahCentang}
                disabled={disabled}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500">Mengubah pilihan akan menyusun ulang diagram dan menimpa suntingan di lembar gambar.</p>
        </div>
      )}
    </Card>
  )
}

/** Membuang item yang tidak dicentang beserta keterkaitannya. */
function saringRantai(r: RantaiArsitektur, buang: Set<string>): PilihanRantai {
  const tetap = <T extends ItemArsitektur>(xs: T[]) => xs.filter((x) => !buang.has(x.id))
  const ada = (xs: ItemArsitektur[]) => new Set(xs.map((x) => x.id))
  const data = tetap(r.data)
  const layanan = tetap(r.layanan)
  const infrastruktur = tetap(r.infrastruktur)
  const [d, l, i] = [ada(data), ada(layanan), ada(infrastruktur)]
  const aplikasi = tetap(r.aplikasi).map((a) => ({
    ...a,
    data: a.data.filter((x) => d.has(x)),
    layanan: a.layanan.filter((x) => l.has(x)),
    infrastruktur: a.infrastruktur.filter((x) => i.has(x)),
  }))
  return { prosesBisnis: r.prosesBisnis, data, aplikasi, layanan, infrastruktur }
}

function DaftarCentang({
  judul,
  sumber,
  items,
  buang,
  onChange,
  disabled,
}: {
  judul: string
  sumber: string
  items: ItemArsitektur[]
  buang: Set<string>
  onChange(id: string, nyala: boolean): void
  disabled: boolean
}) {
  const dipilih = items.filter((x) => !buang.has(x.id)).length
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">
        {judul} <span className="font-normal text-slate-500">({dipilih}/{items.length})</span>
      </legend>
      <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2" title={`Sumber: sheet ${sumber}`}>
        {items.length === 0 ? (
          <p className="px-2 py-1 text-sm text-slate-500">Tidak ada yang terkait.</p>
        ) : (
          items.map((x) => (
            <label key={x.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" className="mt-0.5" checked={!buang.has(x.id)} onChange={(e) => onChange(x.id, e.target.checked)} />
              <span>
                {x.nama}
                <span className="block font-mono text-[11px] text-slate-400">{x.id}</span>
              </span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  )
}
