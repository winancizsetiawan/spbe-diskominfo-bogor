import { Building2, ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import { KONTAK } from '@/components/layout/Hakcipta'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { errorMessage } from '@/lib/errors'
import { useBantuan } from '../api'

const judul = 'mb-3 text-lg font-semibold text-slate-900'

export function BantuanPage() {
  const bantuan = useBantuan()

  return (
    <>
      <PageHeader title="Bantuan" description="Pertanyaan umum, panduan penggunaan, dan video tutorial." />
      {bantuan.isPending ? (
        <Spinner className="py-16" />
      ) : bantuan.isError ? (
        <ErrorState message={errorMessage(bantuan.error)} onRetry={() => void bantuan.refetch()} />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="faq">
            <h2 id="faq" className={judul}>Pertanyaan umum</h2>
            <div className="space-y-2">
              {bantuan.data.faq.map((f) => (
                <details key={f.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <summary className="cursor-pointer font-medium text-slate-900">{f.pertanyaan}</summary>
                  <p className="mt-2 text-sm text-slate-600">{f.jawaban}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="panduan">
            <h2 id="panduan" className={judul}>Panduan penggunaan</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {bantuan.data.panduan.map((p) => (
                <Card key={p.id}>
                  <h3 className="font-semibold text-slate-900">{p.judul}</h3>
                  <p className="mt-1 text-sm text-slate-600">{p.isi}</p>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="video">
            <h2 id="video" className={judul}>Video tutorial</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bantuan.data.video.map((v) => (
                <li key={v.id}>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-200">
                    <span className="font-medium text-slate-900">{v.judul}</span>
                    <ExternalLink className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="sr-only">(buka di tab baru)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

        </div>
      )}

      {/* Di luar status muat agar kontak tetap terlihat walau data bantuan gagal dimuat. */}
      <section aria-labelledby="kontak" className="mt-8">
        <h2 id="kontak" className={judul}>Kontak kami</h2>
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="font-semibold text-slate-900">{KONTAK.instansi}</p>
              <p className="text-sm text-slate-700">{KONTAK.bidang}</p>
              <p className="mt-1 text-sm text-slate-500">Pengelola Portal SPBE Pemerintah Kota Bogor</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Belum menemukan jawaban?{' '}
            <Link to="/kritik-saran" className="font-medium text-brand-700 hover:underline">
              Kirim kritik dan saran
            </Link>
            .
          </p>
        </Card>
      </section>
    </>
  )
}
