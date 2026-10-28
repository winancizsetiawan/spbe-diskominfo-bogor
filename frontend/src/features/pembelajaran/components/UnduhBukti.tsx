import { Download } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { toast } from '@/components/ui/toast'
import type { Sertifikat } from '../types'

const BIRU: [number, number, number] = [30, 41, 140]

/** jsPDF dimuat saat tombol ditekan agar tidak menambah bundel awal. */
async function buatPdf(s: Sertifikat, penerima: { nama: string; instansi: string }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const tengah = 148.5
  const tanggal = new Date(s.diterbitkanPada).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  doc.setDrawColor(...BIRU).setLineWidth(1.2).rect(10, 10, 277, 190)
  doc.setLineWidth(0.3).rect(14, 14, 269, 182)

  doc.setTextColor(...BIRU).setFont('helvetica', 'bold').setFontSize(13)
  doc.text('PEMERINTAH KOTA BOGOR', tengah, 34, { align: 'center' })
  doc.setFontSize(11).setFont('helvetica', 'normal')
  doc.text('Portal SPBE Kota Bogor', tengah, 41, { align: 'center' })

  doc.setFont('helvetica', 'bold').setFontSize(28)
  doc.text('BUKTI PENYELESAIAN PEMBELAJARAN', tengah, 66, { align: 'center' })

  doc.setTextColor(60, 60, 60).setFont('helvetica', 'normal').setFontSize(12)
  doc.text('Diberikan kepada', tengah, 84, { align: 'center' })
  doc.setTextColor(0, 0, 0).setFont('helvetica', 'bold').setFontSize(24)
  doc.text(penerima.nama, tengah, 98, { align: 'center', maxWidth: 240 })
  doc.setFont('helvetica', 'normal').setFontSize(12).setTextColor(60, 60, 60)
  doc.text(penerima.instansi, tengah, 107, { align: 'center', maxWidth: 240 })

  doc.text('yang telah menyelesaikan seluruh materi kursus', tengah, 122, { align: 'center' })
  doc.setTextColor(...BIRU).setFont('helvetica', 'bold').setFontSize(20)
  doc.text(s.kursus, tengah, 135, { align: 'center', maxWidth: 240 })

  doc.setTextColor(60, 60, 60).setFont('helvetica', 'normal').setFontSize(11)
  doc.text(`Nomor: ${s.nomor}`, tengah, 156, { align: 'center' })
  doc.text(`Diterbitkan di Bogor, ${tanggal}`, tengah, 163, { align: 'center' })

  doc.setFontSize(9).setTextColor(100, 100, 100)
  doc.text('Bukti penyelesaian internal portal; bukan sertifikat kompetensi dan tidak bernilai angka kredit (SKP).', tengah, 182, { align: 'center' })

  doc.save(`bukti-penyelesaian-${s.nomor.replaceAll('/', '-')}.pdf`)
}

export function UnduhBukti({ sertifikat }: { sertifikat: Sertifikat }) {
  const { user } = useAuth()
  const [proses, setProses] = useState(false)

  const unduh = async () => {
    if (!user) return
    setProses(true)
    try {
      await buatPdf(sertifikat, { nama: user.nama, instansi: user.instansi.nama })
    } catch {
      toast.error('Gagal membuat berkas PDF. Coba lagi.')
    } finally {
      setProses(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void unduh()}
      disabled={proses}
      aria-label={`Unduh bukti penyelesaian ${sertifikat.kursus} (PDF)`}
      className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
    >
      <Download className="size-4" aria-hidden /> {proses ? 'Membuat PDF…' : 'Unduh PDF'}
    </button>
  )
}
