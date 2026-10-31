import { AlertTriangle, Info } from 'lucide-react'
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
import { useAplikasi, useReferensiInstansi, useReferensiRaa, useSimpanAplikasi } from '../api'
import { NilaiBar } from '../components/NilaiBar'
import { StatusRaaBadge } from '../components/StatusBadge'
import {
  BATAS_APLIKASI,
  cariNodeRaa,
  hitungKesesuaian,
  KATEGORI_APLIKASI,
  statusRaaDari,
  type Aplikasi,
  type AplikasiInput,
} from '../types'

interface FormValues {
  nama: string
  deskripsi: string
  kategori: string
  raa1: string
  raa2: string
  raa3: string
  idInstansi: string
}

const KOSONG: FormValues = { nama: '', deskripsi: '', kategori: '', raa1: '', raa2: '', raa3: '', idInstansi: '' }

function keForm(a: Aplikasi): FormValues {
  return {
    nama: a.nama,
    deskripsi: a.deskripsi,
    kategori: a.kategori ?? '',
    raa1: a.raa.level1 ?? '',
    raa2: a.raa.level2 ?? '',
    raa3: a.raa.level3 ?? '',
    idInstansi: String(a.instansi.id),
  }
}

function keInput(v: FormValues, denganInstansi: boolean): AplikasiInput {
  return {
    nama: v.nama.trim(),
    deskripsi: v.deskripsi.trim(),
    kategori: v.kategori || null,
    raa: { level1: v.raa1 || null, level2: v.raa2 || null, level3: v.raa3 || null },
    ...(denganInstansi ? { idInstansi: Number(v.idInstansi) } : {}),
  }
}

// Nama field server → nama field form, untuk menampilkan error 422 di tempat yang tepat.
const FIELD_SERVER: Record<string, keyof FormValues> = {
  nama: 'nama',
  deskripsi: 'deskripsi',
  kategori: 'kategori',
  raa: 'raa1',
  idInstansi: 'idInstansi',
}

const aria = (name: string, error?: string) => ({
  'aria-invalid': !!error,
  'aria-describedby': error ? `${name}-error` : undefined,
})

export function AplikasiFormPage() {
  const params = useParams()
  const editId = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const { user } = useAuth()
  // Super Admin memilih instansi pemilik saat menambah; Admin OPD selalu instansinya sendiri.
  const pilihInstansi = user?.role === 'super_admin' && editId === undefined

  const detail = useAplikasi(editId)
  const raa = useReferensiRaa()
  const instansi = useReferensiInstansi(pilihInstansi)
  const simpan = useSimpanAplikasi(editId)

  const { register, handleSubmit, setValue, setError, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: KOSONG,
    values: detail.data ? keForm(detail.data) : undefined,
  })

  const nilai = watch()
  const level2 = cariNodeRaa(raa.data, nilai.raa1)?.anak ?? []
  const level3 = cariNodeRaa(raa.data, nilai.raa2)?.anak ?? []
  const perkiraan = hitungKesesuaian(keInput(nilai, false))

  if (editId !== undefined && (!Number.isInteger(editId) || editId <= 0 || isStatus(detail.error, 404))) {
    return <NotFoundPage />
  }
  if (isStatus(detail.error, 403)) return <ForbiddenPage />
  if (editId !== undefined && detail.isPending) return <Spinner className="py-24" />
  if (detail.isError) return <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />

  const status = detail.data?.statusValidasi
  const terkunci = status === 'menunggu'

  const kirim = handleSubmit((v) =>
    simpan.mutate(keInput(v, pilihInstansi), {
      onSuccess: (a) => {
        toast.success(editId ? `Perubahan ${a.nama} disimpan sebagai Draft.` : `${a.nama} ditambahkan sebagai Draft.`)
        navigate('/katalog/aplikasi')
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) {
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            setError(FIELD_SERVER[field] ?? 'nama', { message })
          }
        } else if (err instanceof ApiError && err.status === 409) {
          toast.error('Data sedang menunggu validasi sehingga tidak dapat diubah.')
        } else {
          toast.error(errorMessage(err))
        }
      },
    }),
  )

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={editId ? `Ubah ${detail.data?.nama ?? 'aplikasi'}` : 'Tambah Aplikasi'}
        description="Lengkapi data dan klasifikasi RAA Level 1–3 sesuai pedoman arsitektur SPBE."
      />

      {terkunci && (
        <p role="status" className="mb-4 flex gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Data ini sedang menunggu keputusan Super Admin dan tidak dapat diubah.
        </p>
      )}
      {detail.data?.catatanValidasi && (
        <p role="note" className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Catatan validator:</span> {detail.data.catatanValidasi}
          </span>
        </p>
      )}
      {status && status !== 'draft' && !terkunci && (
        <p className="mb-4 text-sm text-slate-600">Menyimpan perubahan akan mengembalikan status data ini ke Draft.</p>
      )}

      <Card>
        <form onSubmit={kirim} noValidate>
          <fieldset disabled={terkunci} className="space-y-5">
            {pilihInstansi && (
              <Field id="idInstansi" label="Instansi pemilik" error={errors.idInstansi?.message}>
                <select
                  id="idInstansi"
                  className={inputClass}
                  {...aria('idInstansi', errors.idInstansi?.message)}
                  {...register('idInstansi', { required: 'Pilih instansi pemilik.' })}
                >
                  <option value="">Pilih instansi…</option>
                  {instansi.data?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nama}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field id="nama" label="Nama aplikasi" error={errors.nama?.message}>
              <input
                id="nama"
                className={inputClass}
                {...aria('nama', errors.nama?.message)}
                {...register('nama', {
                  validate: (v) => v.trim().length >= BATAS_APLIKASI.namaMin || `Nama minimal ${BATAS_APLIKASI.namaMin} karakter.`,
                  maxLength: { value: BATAS_APLIKASI.namaMax, message: `Nama maksimal ${BATAS_APLIKASI.namaMax} karakter.` },
                })}
              />
            </Field>

            <Field id="deskripsi" label="Deskripsi" error={errors.deskripsi?.message} hint="Fungsi utama aplikasi dan penggunanya.">
              <textarea
                id="deskripsi"
                rows={3}
                className={inputClass}
                {...aria('deskripsi', errors.deskripsi?.message)}
                {...register('deskripsi', {
                  maxLength: { value: BATAS_APLIKASI.deskripsiMax, message: `Deskripsi maksimal ${BATAS_APLIKASI.deskripsiMax} karakter.` },
                })}
              />
            </Field>

            <Field id="kategori" label="Kategori" error={errors.kategori?.message}>
              <select id="kategori" className={inputClass} {...aria('kategori', errors.kategori?.message)} {...register('kategori')}>
                <option value="">Belum dipilih</option>
                {KATEGORI_APLIKASI.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>

            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-800">Klasifikasi RAA</legend>
              <p className="text-xs text-slate-500">
                Pilih berurutan dari Level 1. Mengganti level atas mengosongkan level di bawahnya.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field id="raa1" label="Level 1" error={errors.raa1?.message}>
                  {/* value eksplisit: opsi level bawah baru ada setelah level atas terisi,
                      jadi nilai awal dari server harus diterapkan ulang saat opsi muncul. */}
                  <select
                    id="raa1"
                    className={inputClass}
                    disabled={raa.isPending}
                    value={nilai.raa1}
                    {...aria('raa1', errors.raa1?.message)}
                    {...register('raa1', {
                      onChange: () => {
                        setValue('raa2', '')
                        setValue('raa3', '')
                      },
                    })}
                  >
                    <option value="">—</option>
                    {raa.data?.map((n) => (
                      <option key={n.kode} value={n.kode}>
                        {n.kode} {n.nama}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="raa2" label="Level 2">
                  <select
                    id="raa2"
                    className={inputClass}
                    disabled={level2.length === 0}
                    value={nilai.raa2}
                    {...register('raa2', { onChange: () => setValue('raa3', '') })}
                  >
                    <option value="">—</option>
                    {level2.map((n) => (
                      <option key={n.kode} value={n.kode}>
                        {n.kode} {n.nama}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="raa3" label="Level 3">
                  <select id="raa3" className={inputClass} disabled={level3.length === 0} value={nilai.raa3} {...register('raa3')}>
                    <option value="">—</option>
                    {level3.map((n) => (
                      <option key={n.kode} value={n.kode}>
                        {n.kode} {n.nama}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Perkiraan nilai kesesuaian:</span>
              <NilaiBar nilai={perkiraan} label="Perkiraan nilai kesesuaian" />
              <StatusRaaBadge status={statusRaaDari(perkiraan)} />
            </div>

            <div className="flex justify-end gap-2">
              <Link to="/katalog/aplikasi" className={buttonClass('secondary')}>
                Batal
              </Link>
              <Button type="submit" disabled={simpan.isPending || terkunci}>
                {simpan.isPending ? 'Menyimpan…' : 'Simpan sebagai Draft'}
              </Button>
            </div>
          </fieldset>
        </form>
      </Card>
    </div>
  )
}
