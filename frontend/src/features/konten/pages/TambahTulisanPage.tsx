import { ArrowLeft, Save } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { Button, buttonClass } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { TagInput } from '@/components/ui/TagInput'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { useBuatArtikel } from '../api'
import {
  AKSES_LABEL,
  BATAS_ARTIKEL as B,
  FORMAT_LABEL,
  JENIS_LABEL,
  KATEGORI_ARTIKEL,
  URL_LABEL,
  type AksesArtikel,
  type FormatArtikel,
  type JenisArtikel,
} from '../types'

interface FormValues {
  judul: string
  format: FormatArtikel
  urlSumber: string
  penulis: string[]
  kolaborator: string[]
  ringkasan: string
  konten: string
  kategori: string
  label: string[]
  tanggalTerbit: string
  statusAkses: AksesArtikel | ''
  unggulan: boolean
}

const aria = (name: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${name}-error` : undefined,
})

const hariIni = () => {
  const d = new Date()
  const dua = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`
}

/** Formulir tambah berita/artikel (Super Admin). Susunan field mengikuti "Tambah Pengetahuan" di SIMPAN BRIN. */
export function TambahTulisanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const jenis: JenisArtikel = params.get('jenis') === 'artikel' ? 'artikel' : 'berita'
  const label = JENIS_LABEL[jenis]
  const buat = useBuatArtikel()

  const { register, control, handleSubmit, setError, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      judul: '',
      format: 'teks',
      urlSumber: '',
      penulis: user ? [user.nama] : [],
      kolaborator: [],
      ringkasan: '',
      konten: '',
      kategori: '',
      label: [],
      tanggalTerbit: hariIni(),
      statusAkses: '',
      unggulan: false,
    },
  })
  const format = watch('format')

  const simpan = handleSubmit((v) =>
    buat.mutate(
      {
        jenis,
        judul: v.judul.trim(),
        format: v.format,
        urlSumber: v.urlSumber.trim(),
        penulis: v.penulis,
        kolaborator: v.kolaborator,
        ringkasan: v.ringkasan.trim(),
        konten: v.konten.trim(),
        kategori: v.kategori,
        label: v.label,
        tanggalTerbit: v.tanggalTerbit,
        statusAkses: v.statusAkses as AksesArtikel,
        unggulan: v.unggulan,
      },
      {
        onSuccess: (a) => {
          toast.success(`${label} disimpan dan diajukan ke Verifikator untuk ditinjau sebelum terbit.`)
          navigate(`/berita/${a.id}`)
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 422) {
            for (const [field, message] of Object.entries(err.fieldErrors)) setError(field as keyof FormValues, { message })
          } else {
            toast.error(errorMessage(err))
          }
        },
      },
    ),
  )

  return (
    <form onSubmit={simpan} noValidate>
      <nav aria-label="Jejak halaman" className="mb-3 text-sm text-slate-500">
        <Link to="/beranda" className="hover:text-brand-700 hover:underline">Beranda</Link>
        <span aria-hidden> › </span>
        <Link to="/berita" className="hover:text-brand-700 hover:underline">Berita &amp; Artikel</Link>
        <span aria-hidden> › </span>
        <span className="font-medium text-slate-800" aria-current="page">Buat</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Tambah {label.toLowerCase()}</h1>
        <div className="flex gap-2">
          <Link to="/berita" className={buttonClass('secondary')}>
            <ArrowLeft className="size-4" aria-hidden /> Kembali
          </Link>
          <Button type="submit" disabled={buat.isPending}>
            <Save className="size-4" aria-hidden /> {buat.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Field id="judul" label="Judul" error={errors.judul?.message}>
            <input
              id="judul"
              autoComplete="off"
              placeholder="Masukkan judul"
              className={inputClass}
              {...aria('judul', errors.judul?.message)}
              {...register('judul', {
                validate: (v) => v.trim().length >= B.judulMin || `Judul minimal ${B.judulMin} karakter.`,
                maxLength: { value: B.judulMax, message: `Judul maksimal ${B.judulMax} karakter.` },
              })}
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Format</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(Object.keys(FORMAT_LABEL) as FormatArtikel[]).map((f) => (
                <label key={f} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="radio" value={f} className="size-4 accent-brand-700" {...register('format')} />
                  {FORMAT_LABEL[f]}
                </label>
              ))}
            </div>
          </fieldset>

          <Field id="urlSumber" label={URL_LABEL[format]} error={errors.urlSumber?.message} hint="Opsional. Tautan lengkap diawali https://.">
            <input
              id="urlSumber"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={`Masukkan ${URL_LABEL[format].toLowerCase()}`}
              className={inputClass}
              {...aria('urlSumber', errors.urlSumber?.message)}
              {...register('urlSumber', {
                validate: (v) => !v.trim() || /^https?:\/\/\S+$/i.test(v.trim()) || 'Isi URL lengkap yang diawali http:// atau https://.',
              })}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="penulis" label="Penulis" error={errors.penulis?.message} hint="Ketik nama lalu tekan Enter.">
              <Controller
                name="penulis"
                control={control}
                rules={{ validate: (v) => v.length > 0 || 'Isi minimal satu penulis.' }}
                render={({ field }) => (
                  <TagInput id="penulis" value={field.value} onChange={field.onChange} maksimal={B.penulisMaks} maksPanjang={B.namaMaks} placeholder="Nama penulis" {...aria('penulis', errors.penulis?.message)} />
                )}
              />
            </Field>
            <Field id="kolaborator" label="Kolaborator" error={errors.kolaborator?.message} hint="Opsional. Tekan Enter untuk menambah.">
              <Controller
                name="kolaborator"
                control={control}
                render={({ field }) => (
                  <TagInput id="kolaborator" value={field.value} onChange={field.onChange} maksimal={B.kolaboratorMaks} maksPanjang={B.namaMaks} placeholder="Nama kolaborator" {...aria('kolaborator', errors.kolaborator?.message)} />
                )}
              />
            </Field>
          </div>

          <Field id="ringkasan" label="Ringkasan" error={errors.ringkasan?.message} hint="Satu atau dua kalimat yang tampil di daftar. Teks polos.">
            <textarea
              id="ringkasan"
              rows={4}
              className={inputClass}
              {...aria('ringkasan', errors.ringkasan?.message)}
              {...register('ringkasan', {
                validate: (v) => v.trim().length >= B.ringkasanMin || `Ringkasan minimal ${B.ringkasanMin} karakter.`,
                maxLength: { value: B.ringkasanMax, message: `Ringkasan maksimal ${B.ringkasanMax} karakter.` },
              })}
            />
          </Field>

          <Field id="konten" label="Detail" error={errors.konten?.message} hint="Teks polos. Pisahkan paragraf dengan satu baris kosong.">
            <textarea
              id="konten"
              rows={12}
              className={inputClass}
              {...aria('konten', errors.konten?.message)}
              {...register('konten', { validate: (v) => v.trim().length >= B.kontenMin || `Detail minimal ${B.kontenMin} karakter.` })}
            />
          </Field>
        </div>

        <div className="space-y-5 lg:pt-0">
          <Field id="kategori" label="Kategori" error={errors.kategori?.message}>
            <select
              id="kategori"
              className={inputClass}
              {...aria('kategori', errors.kategori?.message)}
              {...register('kategori', { validate: (v) => !!v || 'Pilih kategori.' })}
            >
              <option value="">Pilih kategori</option>
              {KATEGORI_ARTIKEL.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>

          <Field id="label" label="Label" error={errors.label?.message} hint="Opsional. Tekan Enter untuk menambah.">
            <Controller
              name="label"
              control={control}
              render={({ field }) => (
                <TagInput id="label" value={field.value} onChange={field.onChange} maksimal={B.labelMaks} maksPanjang={B.labelPanjangMaks} placeholder="Pilih atau ketik label" {...aria('label', errors.label?.message)} />
              )}
            />
          </Field>

          <Field id="tanggalTerbit" label="Tanggal terbit" error={errors.tanggalTerbit?.message}>
            <input
              id="tanggalTerbit"
              type="date"
              className={inputClass}
              {...aria('tanggalTerbit', errors.tanggalTerbit?.message)}
              {...register('tanggalTerbit', { validate: (v) => !!v || 'Isi tanggal terbit.' })}
            />
          </Field>

          <Field id="statusAkses" label="Status akses" error={errors.statusAkses?.message}>
            <select
              id="statusAkses"
              className={inputClass}
              {...aria('statusAkses', errors.statusAkses?.message)}
              {...register('statusAkses', { validate: (v) => !!v || 'Pilih status akses.' })}
            >
              <option value="">Pilih status</option>
              {(Object.keys(AKSES_LABEL) as AksesArtikel[]).map((a) => (
                <option key={a} value={a}>
                  {AKSES_LABEL[a]}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <label htmlFor="unggulan" className="text-sm font-semibold text-slate-900">
                Unggulan
              </label>
              <p id="unggulan-info" className="mt-0.5 text-sm text-slate-500">
                Didahulukan di daftar berita dan artikel.
              </p>
            </div>
            <input
              id="unggulan"
              type="checkbox"
              role="switch"
              aria-describedby="unggulan-info"
              className="relative mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-white before:transition checked:bg-brand-600 checked:before:translate-x-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              {...register('unggulan')}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
