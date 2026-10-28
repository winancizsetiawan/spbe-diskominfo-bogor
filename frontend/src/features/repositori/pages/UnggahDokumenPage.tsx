import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { Button, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, inputClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { toast } from '@/components/ui/toast'
import { useKategoriDokumen } from '@/features/dokumen/api'
import { JENIS_LABEL, type JenisDokumen, type Visibilitas } from '@/features/dokumen/types'
import { errorMessage } from '@/lib/errors'
import { invalidasiRepositori } from '../api'
import { FileDropzone } from '../components/FileDropzone'
import { UploadProgress } from '../components/UploadProgress'
import { BATAS_METADATA, POLA_VERSI, validasiBerkas } from '../types'
import { unggahDokumen, type FaseUnggah } from '../unggah'

interface FormValues {
  jenis: JenisDokumen
  idKategori: string
  judul: string
  deskripsi: string
  versi: string
  sumber: string
  visibilitas: Visibilitas
}

const JENIS_PILIHAN = Object.keys(JENIS_LABEL) as JenisDokumen[]

// Nama field server → field form, untuk menampilkan error 422 di tempat yang tepat.
const FIELD_SERVER: Record<string, keyof FormValues> = {
  jenis: 'jenis',
  kategori: 'idKategori',
  idKategori: 'idKategori',
  judul: 'judul',
  deskripsi: 'deskripsi',
  versi: 'versi',
  sumber: 'sumber',
  visibilitas: 'visibilitas',
}

const aria = (name: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${name}-error` : undefined,
})

export function UnggahDokumenPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [errorBerkas, setErrorBerkas] = useState<string>()
  const [fase, setFase] = useState<FaseUnggah>('diam')
  const [persen, setPersen] = useState(0)
  const pembatal = useRef<AbortController | null>(null)
  const sibuk = fase !== 'diam'

  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { jenis: 'sop', idKategori: '', judul: '', deskripsi: '', versi: '1.0', sumber: '', visibilitas: 'internal' },
  })
  const jenis = watch('jenis')
  const kategori = useKategoriDokumen('sop', jenis === 'sop')

  const pilihBerkas = (f: File | null) => {
    setFile(f)
    setErrorBerkas(f ? (validasiBerkas(f) ?? undefined) : undefined)
  }

  // Bila isian form tidak valid, error berkas tetap ditampilkan bersamaan agar semua masalah terlihat sekaligus.
  const kirim = handleSubmit(onValid, () => {
    if (!file) setErrorBerkas('Pilih berkas yang akan diunggah.')
  })

  async function onValid(v: FormValues) {
    if (!file) return setErrorBerkas('Pilih berkas yang akan diunggah.')
    const salah = validasiBerkas(file)
    if (salah) return setErrorBerkas(salah)

    const pengendali = new AbortController()
    pembatal.current = pengendali
    try {
      const dokumen = await unggahDokumen(
        file,
        {
          jenis: v.jenis,
          idKategori: v.jenis === 'sop' ? Number(v.idKategori) : null,
          judul: v.judul.trim(),
          deskripsi: v.deskripsi.trim(),
          versi: v.versi.trim(),
          sumber: v.sumber.trim() || null,
          visibilitas: v.visibilitas,
        },
        { onFase: setFase, onProgres: setPersen, signal: pengendali.signal },
      )
      invalidasiRepositori(qc)
      toast.success(`${dokumen.judul} diunggah sebagai Draft. Ubah status menjadi Berlaku untuk menerbitkan.`)
      navigate('/admin/repositori?status=draft')
    } catch (err) {
      setFase('diam')
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.info('Unggahan dibatalkan.')
      } else if (err instanceof ApiError && err.status === 422) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          if (field === 'berkas') setErrorBerkas(message)
          else setError(FIELD_SERVER[field] ?? 'judul', { message })
        }
      } else {
        toast.error(errorMessage(err))
      }
    } finally {
      pembatal.current = null
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Unggah Dokumen"
        description="Berkas disimpan di Object Storage dan terbit sebagai Draft. Terbitkan setelah memeriksa isinya."
      />
      <Card>
        <form onSubmit={kirim} noValidate className="space-y-5">
          <fieldset disabled={sibuk} className="space-y-5">
            <FileDropzone file={file} onChange={pilihBerkas} error={errorBerkas} disabled={sibuk} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field id="jenis" label="Jenis" error={errors.jenis?.message}>
                <select id="jenis" className={inputClass} {...aria('jenis', errors.jenis?.message)} {...register('jenis')}>
                  {JENIS_PILIHAN.map((j) => (
                    <option key={j} value={j}>
                      {JENIS_LABEL[j]}
                    </option>
                  ))}
                </select>
              </Field>

              {jenis === 'sop' && (
                <Field id="idKategori" label="Kategori SOP" error={errors.idKategori?.message}>
                  <select
                    id="idKategori"
                    className={inputClass}
                    disabled={kategori.isPending}
                    {...aria('idKategori', errors.idKategori?.message)}
                    {...register('idKategori', { validate: (v) => jenis !== 'sop' || v !== '' || 'Pilih kategori SOP.' })}
                  >
                    <option value="">Pilih kategori…</option>
                    {kategori.data?.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <Field id="judul" label="Judul" error={errors.judul?.message}>
              <input
                id="judul"
                className={inputClass}
                {...aria('judul', errors.judul?.message)}
                {...register('judul', {
                  validate: (v) => v.trim().length >= BATAS_METADATA.judulMin || `Judul minimal ${BATAS_METADATA.judulMin} karakter.`,
                  maxLength: { value: BATAS_METADATA.judulMax, message: `Judul maksimal ${BATAS_METADATA.judulMax} karakter.` },
                })}
              />
            </Field>

            <Field id="deskripsi" label="Deskripsi" error={errors.deskripsi?.message} hint="Ringkasan isi dokumen; membantu pencarian.">
              <textarea
                id="deskripsi"
                rows={3}
                className={inputClass}
                {...aria('deskripsi', errors.deskripsi?.message)}
                {...register('deskripsi', {
                  maxLength: { value: BATAS_METADATA.deskripsiMax, message: `Deskripsi maksimal ${BATAS_METADATA.deskripsiMax} karakter.` },
                })}
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field id="versi" label="Versi" error={errors.versi?.message} hint="Contoh: 1.0 atau 2.4.1">
                <input
                  id="versi"
                  className={inputClass}
                  {...aria('versi', errors.versi?.message)}
                  {...register('versi', {
                    validate: (v) => POLA_VERSI.test(v.trim()) || 'Versi hanya angka dipisah titik, mis. 1.2.',
                    maxLength: { value: BATAS_METADATA.versiMax, message: `Versi maksimal ${BATAS_METADATA.versiMax} karakter.` },
                  })}
                />
              </Field>
              <Field id="sumber" label="Sumber (opsional)" error={errors.sumber?.message}>
                <input
                  id="sumber"
                  className={inputClass}
                  {...aria('sumber', errors.sumber?.message)}
                  {...register('sumber', {
                    maxLength: { value: BATAS_METADATA.sumberMax, message: `Sumber maksimal ${BATAS_METADATA.sumberMax} karakter.` },
                  })}
                />
              </Field>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Visibilitas</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(['internal', 'publik'] as const).map((v) => (
                  <label
                    key={v}
                    className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-checked:border-brand-500 has-checked:bg-brand-50"
                  >
                    <input type="radio" value={v} className="mt-1" aria-describedby={`vis-${v}`} {...register('visibilitas')} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{v === 'internal' ? 'Internal' : 'Publik'}</span>
                      <span id={`vis-${v}`} className="block text-xs text-slate-600">
                        {v === 'internal'
                          ? 'Hanya pengguna yang masuk (ASN, Akademisi, Admin OPD).'
                          : 'Dapat dilihat dan diunduh siapa pun, tanpa login.'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>

          {sibuk && <UploadProgress fase={fase} persen={persen} onBatal={() => pembatal.current?.abort()} />}

          <div className="flex justify-end gap-2">
            <Link to="/admin/repositori" className={buttonClass('secondary', sibuk ? 'pointer-events-none opacity-60' : '')} aria-disabled={sibuk}>
              Batal
            </Link>
            <Button type="submit" disabled={sibuk}>
              {sibuk ? 'Mengunggah…' : 'Unggah sebagai Draft'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
