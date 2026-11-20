import type { AplikasiArsitektur, ItemArsitektur, ProbisArsitektur } from './types'

/** Isi diagram otomatis: proses bisnis beserta keterkaitan yang dicentang pengguna. */
export interface PilihanRantai {
  prosesBisnis: ProbisArsitektur
  data: ItemArsitektur[]
  aplikasi: AplikasiArsitektur[]
  layanan: ItemArsitektur[]
  infrastruktur: ItemArsitektur[]
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** Baris baru di dalam atribut XML (bpmn-js memecah label pada baris baru). */
const BARIS_BARU = '&#10;'

/** Memendekkan nama panjang: buang keterangan dalam kurung, lalu potong dengan elipsis. */
function singkat(nama: string, maks: number): string {
  let n = nama.trim()
  if (n.length > maks && n.includes('(')) n = n.slice(0, n.indexOf('(')).trim() || n
  return n.length > maks ? `${n.slice(0, maks - 1).trimEnd()}…` : n
}

/** "a, b +2" dengan tiap nama dipendekkan agar label muat di kotak. */
function ringkas(nama: string[], maks: number, panjang = 28): string {
  const unik = [...new Set(nama.map((x) => singkat(x, panjang)))]
  return unik.length <= maks ? unik.join(', ') : `${unik.slice(0, maks).join(', ')} +${unik.length - maks}`
}

const TUGAS = { w: 270, h: 80 }
const JARAK_Y = 100
const X_MULAI = 60
const X_PB = 140
const W_PB = 190
const X_BUS_KIRI = X_PB + W_PB + 50
const X_TUGAS = X_BUS_KIRI + 40
const X_BUS_KANAN = X_TUGAS + TUGAS.w + 40
const X_SELESAI = X_BUS_KANAN + 50
const Y_ATAS = 60

type Titik = [number, number]

/**
 * Diagram alur sederhana dari rantai arsitektur:
 * Mulai -> proses bisnis -> (bercabang tanpa simbol gerbang) layanan, masing-masing dengan aplikasi pendukungnya -> Selesai.
 * Data dan infrastruktur ditulis sebagai keterangan pada proses bisnis.
 */
export function bangunBpmnOtomatis(p: PilihanRantai): string {
  // Cabang: setiap layanan beserta aplikasi pendukungnya; aplikasi tanpa layanan menjadi cabang sendiri.
  const cabang: { id: string; kode: string; label: string }[] = []
  p.layanan.forEach((l, i) => {
    const apl = p.aplikasi.filter((a) => a.layanan.includes(l.id)).map((a) => a.nama)
    const nama = esc(singkat(l.nama, 70))
    cabang.push({ id: `Layanan_${i + 1}`, kode: l.id, label: apl.length ? `${nama}${BARIS_BARU}(via ${esc(ringkas(apl, 2))})` : nama })
  })
  p.aplikasi
    .filter((a) => a.layanan.length === 0)
    .forEach((a, i) => cabang.push({ id: `Aplikasi_${i + 1}`, kode: a.id, label: `Aplikasi ${esc(singkat(a.nama, 60))}` }))

  const proses: string[] = []
  const bentuk: string[] = []
  const garis: string[] = []
  const kotak = (id: string, x: number, y: number, w: number, h: number) =>
    bentuk.push(`<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"><dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}" /></bpmndi:BPMNShape>`)
  const tepi = (id: string, titik: Titik[]) =>
    garis.push(`<bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}">${titik.map(([x, y]) => `<di:waypoint x="${x}" y="${y}" />`).join('')}</bpmndi:BPMNEdge>`)
  let nAlur = 0
  const alur = (dari: string, ke: string, titik: Titik[]) => {
    const id = `Alur_${++nAlur}`
    proses.push(`<bpmn:sequenceFlow id="${id}" sourceRef="${dari}" targetRef="${ke}" />`)
    tepi(id, titik)
  }

  const tinggiCabang = Math.max(1, cabang.length) * JARAK_Y
  const cy = Y_ATAS + Math.max(tinggiCabang, 160) / 2

  proses.push('<bpmn:startEvent id="Mulai" name="Mulai" />')
  kotak('Mulai', X_MULAI, cy - 18, 36, 36)
  proses.push(`<bpmn:task id="ProsesBisnis" name="${esc(singkat(p.prosesBisnis.nama, 90))}"><bpmn:documentation>${esc(p.prosesBisnis.id)}</bpmn:documentation></bpmn:task>`)
  kotak('ProsesBisnis', X_PB, cy - 45, W_PB, 90)
  alur('Mulai', 'ProsesBisnis', [[X_MULAI + 36, cy], [X_PB, cy]])
  proses.push('<bpmn:endEvent id="Selesai" name="Selesai" />')

  if (cabang.length === 0) {
    kotak('Selesai', X_PB + W_PB + 80, cy - 18, 36, 36)
    alur('ProsesBisnis', 'Selesai', [[X_PB + W_PB, cy], [X_PB + W_PB + 80, cy]])
  } else {
    // Seperti diagram alur biasa: garis langsung bercabang dari proses bisnis dan menyatu ke Selesai.
    kotak('Selesai', X_SELESAI, cy - 18, 36, 36)
    const yAwal = cy - tinggiCabang / 2
    cabang.forEach((c, i) => {
      const ty = yAwal + i * JARAK_Y + JARAK_Y / 2
      proses.push(`<bpmn:task id="${c.id}" name="${c.label}"><bpmn:documentation>${esc(c.kode)}</bpmn:documentation></bpmn:task>`)
      kotak(c.id, X_TUGAS, ty - TUGAS.h / 2, TUGAS.w, TUGAS.h)
      alur('ProsesBisnis', c.id, ty === cy ? [[X_PB + W_PB, cy], [X_TUGAS, cy]] : [[X_PB + W_PB, cy], [X_BUS_KIRI, cy], [X_BUS_KIRI, ty], [X_TUGAS, ty]])
      alur(c.id, 'Selesai', ty === cy ? [[X_TUGAS + TUGAS.w, cy], [X_SELESAI, cy]] : [[X_TUGAS + TUGAS.w, ty], [X_BUS_KANAN, ty], [X_BUS_KANAN, cy], [X_SELESAI, cy]])
    })
  }

  // Keterangan data dan infrastruktur di bawah proses bisnis: satu item per baris agar rapi.
  const daftar = (judul: string, nama: string[], maks: number): string[] => {
    if (nama.length === 0) return []
    const unik = [...new Set(nama.map((x) => singkat(x, 36)))]
    const baris = unik.slice(0, maks).map((x) => `• ${x}`)
    if (unik.length > maks) baris.push(`• dan ${unik.length - maks} lainnya`)
    return [`${judul}:`, ...baris]
  }
  const dataKet = daftar('Data', p.data.map((d) => d.nama), 5)
  const infraKet = daftar('Infrastruktur', p.infrastruktur.map((x) => x.nama), 3)
  const keterangan = [...dataKet, ...(dataKet.length && infraKet.length ? [''] : []), ...infraKet]
  if (keterangan.length) {
    const yKet = cy + 85
    proses.push(`<bpmn:textAnnotation id="Keterangan"><bpmn:text>${keterangan.map(esc).join(BARIS_BARU)}</bpmn:text></bpmn:textAnnotation>`)
    proses.push('<bpmn:association id="Kaitan_keterangan" sourceRef="ProsesBisnis" targetRef="Keterangan" />')
    // Tinggi mengikuti jumlah baris (huruf keterangan bpmn-js 12px, jarak baris ~15px).
    kotak('Keterangan', X_PB - 20, yKet, 250, keterangan.length * 15 + 16)
    tepi('Kaitan_keterangan', [[X_PB + W_PB / 2, cy + 45], [X_PB + W_PB / 2, yKet]])
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definisi_otomatis" targetNamespace="http://bpmn.io/schema/bpmn">
<bpmn:process id="Proses_otomatis" isExecutable="false">${proses.join('')}</bpmn:process>
<bpmndi:BPMNDiagram id="Diagram_otomatis"><bpmndi:BPMNPlane id="Bidang_otomatis" bpmnElement="Proses_otomatis">
${bentuk.join('')}${garis.join('')}
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
`
}
