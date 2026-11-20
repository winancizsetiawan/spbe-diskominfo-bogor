// Ekspor diagram BPMN ke PNG dan PDF di peramban. Modul ini memuat bpmn-js dan jsPDF,
// jadi impor secara dinamis dari tombol unduh agar tidak membebani halaman.

/** Sisi terpanjang gambar dibatasi agar kanvas tetap dapat dibuat oleh peramban. */
const SISI_MAKS = 8000
const SKALA = 2

export function unduhBlob(blob: Blob, nama: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Merender XML BPMN di wadah tersembunyi lalu mengambil SVG-nya. */
export async function svgDariXml(xml: string): Promise<string> {
  const { default: Viewer } = await import('bpmn-js/lib/Viewer')
  const wadah = document.createElement('div')
  wadah.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:800px;'
  document.body.append(wadah)
  const v = new Viewer({ container: wadah })
  try {
    await v.importXML(xml)
    const { svg } = await v.saveSVG()
    return svg
  } finally {
    v.destroy()
    wadah.remove()
  }
}

export interface GambarPng {
  blob: Blob
  dataUrl: string
  /** Ukuran diagram dalam piksel CSS (sebelum dirender 2x). */
  lebarAsli: number
  tinggiAsli: number
}

/** Mengubah SVG menjadi PNG berlatar putih dengan resolusi 2x (dibatasi SISI_MAKS). */
export async function svgKePng(svg: string): Promise<GambarPng> {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const akar = doc.documentElement
  const vb = (akar.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  const lebarAsli = Number.parseFloat(akar.getAttribute('width') ?? '') || vb[2] || 800
  const tinggiAsli = Number.parseFloat(akar.getAttribute('height') ?? '') || vb[3] || 600
  const skala = Math.min(SKALA, SISI_MAKS / Math.max(lebarAsli, tinggiAsli))
  const lebar = Math.max(1, Math.round(lebarAsli * skala))
  const tinggi = Math.max(1, Math.round(tinggiAsli * skala))

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((selesai, gagal) => {
      img.onload = () => selesai()
      img.onerror = () => gagal(new Error('Gambar diagram tidak dapat dibuat.'))
      img.src = url
    })
    const kanvas = document.createElement('canvas')
    kanvas.width = lebar
    kanvas.height = tinggi
    const ctx = kanvas.getContext('2d')
    if (!ctx) throw new Error('Peramban tidak mendukung pembuatan gambar.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lebar, tinggi)
    ctx.drawImage(img, 0, 0, lebar, tinggi)
    const blob = await new Promise<Blob>((selesai, gagal) =>
      kanvas.toBlob((b) => (b ? selesai(b) : gagal(new Error('Gambar diagram tidak dapat dibuat.'))), 'image/png'),
    )
    return { blob, dataUrl: kanvas.toDataURL('image/png'), lebarAsli, tinggiAsli }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function unduhPng(svg: string, namaBerkas: string) {
  const png = await svgKePng(svg)
  unduhBlob(png.blob, `${namaBerkas}.png`)
}

export interface InfoPdf {
  judul: string
  /** Baris keterangan di bawah judul, mis. kode, versi, status, instansi. */
  keterangan: string[]
}

/**
 * PDF berisi judul, keterangan, dan gambar diagram. Ukuran halaman mengikuti proporsi diagram
 * (minimal A4) agar diagram panjang tidak mengecil hingga tak terbaca.
 */
export async function unduhPdf(xml: string, info: InfoPdf, namaBerkas: string) {
  const [svg, { jsPDF }] = await Promise.all([svgDariXml(xml), import('jspdf')])
  const png = await svgKePng(svg)

  const MARGIN = 36
  const BARIS_JUDUL = 20
  const A4_PENDEK = 595
  const A4_PANJANG = 842
  // 1 piksel CSS = 0,75 pt; resolusi 2x pada PNG membuat gambar tetap tajam saat diperbesar.
  const lebarGambar = png.lebarAsli * 0.75
  const tinggiGambar = png.tinggiAsli * 0.75
  const mendatar = lebarGambar >= tinggiGambar
  const lebarHal = Math.max(mendatar ? A4_PANJANG : A4_PENDEK, lebarGambar + 2 * MARGIN)
  // Judul panjang dibungkus hingga tiga baris; tinggi kepala menyesuaikan.
  const ukurJudul = new jsPDF({ unit: 'pt' })
  ukurJudul.setFont('helvetica', 'bold')
  ukurJudul.setFontSize(16)
  const judul = (ukurJudul.splitTextToSize(info.judul, lebarHal - 2 * MARGIN) as string[]).slice(0, 3)
  const KEPALA = judul.length * BARIS_JUDUL + 12 + 16 * info.keterangan.length + 16
  const tinggiHal = Math.max(mendatar ? A4_PENDEK : A4_PANJANG, tinggiGambar + KEPALA + 2 * MARGIN)

  const pdf = new jsPDF({ unit: 'pt', format: [lebarHal, tinggiHal], orientation: lebarHal >= tinggiHal ? 'landscape' : 'portrait', compress: true })
  pdf.setProperties({ title: info.judul, creator: 'Portal Arsitektur Pemerintah Digital Kota Bogor' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  judul.forEach((baris, i) => pdf.text(baris, MARGIN, MARGIN + 14 + i * BARIS_JUDUL))
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(90)
  const yKet = MARGIN + 14 + (judul.length - 1) * BARIS_JUDUL + 24
  info.keterangan.forEach((baris, i) => pdf.text(baris, MARGIN, yKet + i * 16))

  // Gambar diskalakan agar muat di sisa halaman, lalu diletakkan di tengah.
  const ruangLebar = lebarHal - 2 * MARGIN
  const ruangTinggi = tinggiHal - KEPALA - 2 * MARGIN
  const f = Math.min(1, ruangLebar / lebarGambar, ruangTinggi / tinggiGambar)
  const w = lebarGambar * f
  const h = tinggiGambar * f
  pdf.addImage(png.dataUrl, 'PNG', MARGIN + (ruangLebar - w) / 2, MARGIN + KEPALA, w, h, undefined, 'FAST')
  pdf.save(`${namaBerkas}.pdf`)
}
