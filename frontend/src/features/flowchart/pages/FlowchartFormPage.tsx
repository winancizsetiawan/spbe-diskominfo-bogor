import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { Button, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { toast } from '@/components/ui/toast'
import { errorMessage, isStatus } from '@/lib/errors'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useFlowchart, useOpsiFlowchart, useSimpanFlowchart } from '../api'
import { BPMN_KOSONG } from '../bpmnKosong'
import type { BpmnEditorHandle } from '../components/BpmnEditor'
import { PilihanTerkait } from '../components/PilihanTerkait'
import {
  BATAS_FLOWCHART,
  JENIS_LABEL,
  KATEGORI_LABEL,
  ukuranBytes,
  type FlowchartDetail,
  type JenisProses,
  type KategoriProses,
} from '../types'

// Modeler bpmn-js besar: hanya diunduh saat halaman form dibuka.
const BpmnEditor = lazy(() => import('../components/BpmnEditor'))

interface FormValues {
  nama: string
  deskripsi: string
  kategori: KategoriProses | ''
  jenis: JenisProses | ''
  pic: string
  catatanRevisi: string
}

const KOSONG: FormValues = { nama: '', deskripsi: '', kategori: '', jenis: '', pic: '', catatanRevisi: '' }

const keForm = (f: FlowchartDetail): FormValues => ({
  nama: f.nama,
  deskripsi: f.deskripsi,
  kategori: f.kategori,
  jenis: f.jenis,
  pic: f.pic,
  catatanRevisi: '',
})

const aria = (name: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${name}-error` : undefined,
})

export function FlowchartFormPage() {
  const params = useParams()
  const editId = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const { user } = useAuth()
  const detail = useFlowchart(editId)
  const opsi = useOpsiFlowchart()
  const simpan = useSimpanFlowchart(editId)
  const editor = useRef<BpmnEditorHandle>(null)

  const [aplikasiDipilih, setAplikasiDipilih] = useState<number[]>([])
  const [sopDipilih, setSopDipilih] = useState<number[]>([])
  const [errorDiagram, setErrorDiagram] = useState<string>()
  const [errorTerkait, setErrorTerkait] = useState<{ aplikasi?: string; sop?: string }>({})

  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
    defaultValues: KOSONG,
    values: detail.data ? keForm(detail.data) : undefined,
  })

  // Keterkaitan awal diambil sekali per flowchart agar suntingan tidak tertimpa saat data dimuat ulang.
  const idDimuat = detail.data?.id
  useEffect(() => {
    if (!detail.data) return
    setAplikasiDipilih(detail.data.aplikasi.map((a) => a.id))
    setSopDipilih(detail.data.sop.map((s) => s.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDimuat])

  if (editId === undefined && user?.role !== 'admin_opd') return <ForbiddenPage />
  if (editId !== undefined && (!Number.isInteger(editId) || editId <= 0 || isStatus(detail.error, 404))) return <NotFoundPage />
  if (isStatus(detail.error, 403)) return <ForbiddenPage />
  if (editId !== undefined && detail.isPending) return <Spinner className="py-24" />
  if (detail.isError) return <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />

  if (detail.data?.status === 'menunggu') {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Flowchart sedang divalidasi</h1>
        <p className="mt-2 text-sm text-slate-600">Flowchart yang menunggu keputusan Super Admin tidak dapat diubah.</p>
        <Link to={`/katalog/flowchart/${detail.data.id}`} className={buttonClass('secondary', 'mt-6')}>
          Kembali ke detail
        </Link>
      </div>
    )
  }

  async function onValid(v: FormValues) {
    setErrorDiagram(undefined)
    setErrorTerkait({})
    const hasil = await editor.current?.ambilXml().catch(() => null)
    if (!hasil) return setErrorDiagram('Editor diagram belum siap. Tunggu sebentar lalu coba lagi.')
    // Pemeriksaan klien hanya kenyamanan; server memeriksa ulang isi dan ukuran diagram.
    if (!hasil.adaMulai || !hasil.adaAkhir) return setErrorDiagram('Diagram harus memuat peristiwa awal dan peristiwa akhir.')
    if (ukuranBytes(hasil.xml) > BATAS_FLOWCHART.maksBytes) return setErrorDiagram('Ukuran diagram melebihi 10 MB.')

    simpan.mutate(
      {
        nama: v.nama.trim(),
        deskripsi: v.deskripsi.trim(),
        kategori: v.kategori as KategoriProses,
        jenis: v.jenis as JenisProses,
        pic: v.pic.trim(),
        idAplikasi: aplikasiDipilih,
        idSop: sopDipilih,
        bpmnXml: hasil.xml,
        ...(editId && v.catatanRevisi.trim() && { catatanRevisi: v.catatanRevisi.trim() }),
      },
      {
        onSuccess: (f) => {
          toast.success(editId ? `Versi ${f.versi} disimpan sebagai Draft.` : `${f.nama} dibuat sebagai Draft.`)
          navigate(`/katalog/flowchart/${f.id}`)
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 422) {
            for (const [field, message] of Object.entries(err.fieldErrors)) {
              if (field === 'bpmnXml') setErrorDiagram(message)
              else if (field === 'idAplikasi') setErrorTerkait((e) => ({ ...e, aplikasi: message }))
              else if (field === 'idSop') setErrorTerkait((e) => ({ ...e, sop: message }))
              else setError(field as keyof FormValues, { message })
            }
          } else if (err instanceof ApiError && err.status === 409) {
            toast.error('Flowchart sedang menunggu validasi sehingga tidak dapat diubah.')
          } else {
            toast.error(errorMessage(err))
          }
        },
      },
    )
  }

  const kirim = handleSubmit(onValid)
  const siapDiagram = editId === undefined || !!detail.data

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={editId ? `Edit ${detail.data?.nama ?? 'flowchart'}` : 'Buat Flowchart'}
        description={editId ? 'Perubahan disimpan sebagai versi baru dan status kembali ke Draft.' : 'Gambar diagram di editor atau impor berkas BPMN 2.0. Disimpan sebagai Draft.'}
      />

      <form onSubmit={kirim} noValidate className="space-y-6">
        <Card className="space-y-5">
          <h2 className="font-semibold text-slate-900">Informasi proses</h2>
          <Field id="nama" label="Nama proses" error={errors.nama?.message}>
            <input
              id="nama"
              className={inputClass}
              {...aria('nama', errors.nama?.message)}
              {...register('nama', {
                validate: (v) => v.trim().length >= BATAS_FLOWCHART.namaMin || `Nama minimal ${BATAS_FLOWCHART.namaMin} karakter.`,
                maxLength: { value: BATAS_FLOWCHART.namaMax, message: `Nama maksimal ${BATAS_FLOWCHART.namaMax} karakter.` },
              })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="kategori" label="Kategori proses" error={errors.kategori?.message}>
              <select id="kategori" className={inputClass} {...aria('kategori', errors.kategori?.message)} {...register('kategori', { required: 'Pilih kategori.' })}>
                <option value="">Pilih kategori…</option>
                {(Object.keys(KATEGORI_LABEL) as KategoriProses[]).map((k) => (
                  <option key={k} value={k}>
                    {KATEGORI_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="jenis" label="Jenis" error={errors.jenis?.message}>
              <select id="jenis" className={inputClass} {...aria('jenis', errors.jenis?.message)} {...register('jenis', { required: 'Pilih jenis.' })}>
                <option value="">Pilih jenis…</option>
                {(Object.keys(JENIS_LABEL) as JenisProses[]).map((j) => (
                  <option key={j} value={j}>
                    {JENIS_LABEL[j]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field id="pic" label="Penanggung jawab (PIC)" error={errors.pic?.message} hint="Bidang atau unit yang bertanggung jawab atas proses.">
            <input
              id="pic"
              className={inputClass}
              {...aria('pic', errors.pic?.message)}
              {...register('pic', {
                validate: (v) => v.trim().length >= BATAS_FLOWCHART.picMin || `PIC minimal ${BATAS_FLOWCHART.picMin} karakter.`,
                maxLength: { value: BATAS_FLOWCHART.picMax, message: `PIC maksimal ${BATAS_FLOWCHART.picMax} karakter.` },
              })}
            />
          </Field>

          <Field id="deskripsi" label="Deskripsi" error={errors.deskripsi?.message}>
            <textarea
              id="deskripsi"
              rows={3}
              className={inputClass}
              {...aria('deskripsi', errors.deskripsi?.message)}
              {...register('deskripsi', { maxLength: { value: BATAS_FLOWCHART.deskripsiMax, message: `Deskripsi maksimal ${BATAS_FLOWCHART.deskripsiMax} karakter.` } })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PilihanTerkait
              legend="Aplikasi terkait"
              items={opsi.data?.aplikasi.map((a) => ({ id: a.id, label: a.nama }))}
              terpilih={aplikasiDipilih}
              onChange={setAplikasiDipilih}
              kosong="Belum ada aplikasi di instansi ini."
              error={errorTerkait.aplikasi}
              disabled={simpan.isPending}
            />
            <PilihanTerkait
              legend="SOP terkait"
              items={opsi.data?.sop.map((s) => ({ id: s.id, label: s.judul }))}
              terpilih={sopDipilih}
              onChange={setSopDipilih}
              kosong="Belum ada SOP."
              error={errorTerkait.sop}
              disabled={simpan.isPending}
            />
          </div>

          {editId && (
            <Field id="catatanRevisi" label="Catatan revisi (opsional)" error={errors.catatanRevisi?.message} hint="Masuk ke riwayat revisi.">
              <input
                id="catatanRevisi"
                className={inputClass}
                {...aria('catatanRevisi', errors.catatanRevisi?.message)}
                {...register('catatanRevisi', { maxLength: { value: BATAS_FLOWCHART.catatanMax, message: `Catatan maksimal ${BATAS_FLOWCHART.catatanMax} karakter.` } })}
              />
            </Field>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold text-slate-900">Diagram BPMN</h2>
          {siapDiagram ? (
            <Suspense fallback={<Spinner className="py-24" label="Memuat editor diagram…" />}>
              <BpmnEditor ref={editor} xmlAwal={detail.data?.bpmnXml ?? BPMN_KOSONG} namaBerkas={detail.data?.kode ?? 'flowchart-baru'} disabled={simpan.isPending} />
            </Suspense>
          ) : (
            <Spinner className="py-24" />
          )}
          {errorDiagram && (
            <p role="alert" className="text-sm text-red-600">
              {errorDiagram}
            </p>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Link to={editId ? `/katalog/flowchart/${editId}` : '/katalog/flowchart'} className={buttonClass('secondary')}>
            Batal
          </Link>
          <Button type="submit" disabled={simpan.isPending}>
            {simpan.isPending ? 'Menyimpan…' : 'Simpan sebagai Draft'}
          </Button>
        </div>
      </form>
    </div>
  )
}
