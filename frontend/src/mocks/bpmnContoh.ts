const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface Node {
  id: string
  tipe: 'start' | 'task' | 'gateway' | 'end'
  nama: string
  x: number
  y: number
  w: number
  h: number
}

const GARIS_TENGAH = 120
const JARAK = 60

/**
 * Bangun diagram BPMN 2.0 lengkap (model + tata letak) untuk data contoh.
 * `langkah`: teks biasa = tugas; awalan "?" = gateway keputusan (jalur "Ya" lanjut,
 * jalur "Tidak" kembali ke langkah sebelumnya).
 */
export function buatBpmn(kunci: string, langkah: string[]): string {
  const nodes: Node[] = []
  let kursor = 150
  const tambah = (n: Omit<Node, 'x' | 'y'>) => {
    nodes.push({ ...n, x: kursor, y: GARIS_TENGAH - n.h / 2 })
    kursor += n.w + JARAK
  }

  tambah({ id: `Mulai_${kunci}`, tipe: 'start', nama: 'Mulai', w: 36, h: 36 })
  langkah.forEach((teks, i) => {
    if (teks.startsWith('?')) tambah({ id: `Gerbang_${kunci}_${i}`, tipe: 'gateway', nama: teks.slice(1), w: 50, h: 50 })
    else tambah({ id: `Tugas_${kunci}_${i}`, tipe: 'task', nama: teks, w: 100, h: 80 })
  })
  tambah({ id: `Selesai_${kunci}`, tipe: 'end', nama: 'Selesai', w: 36, h: 36 })

  const elemen = { start: 'startEvent', task: 'task', gateway: 'exclusiveGateway', end: 'endEvent' } as const
  const model: string[] = []
  const tata: string[] = []
  const alur: string[] = []
  const garis: string[] = []

  for (const n of nodes) {
    model.push(`    <bpmn:${elemen[n.tipe]} id="${n.id}" name="${esc(n.nama)}" />`)
    tata.push(
      `      <bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}"${n.tipe === 'gateway' ? ' isMarkerVisible="true"' : ''}>` +
        `<dc:Bounds x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" /></bpmndi:BPMNShape>`,
    )
  }

  const tambahAlur = (id: string, dari: Node, ke: Node, titik: [number, number][], nama?: string) => {
    alur.push(`    <bpmn:sequenceFlow id="${id}" sourceRef="${dari.id}" targetRef="${ke.id}"${nama ? ` name="${esc(nama)}"` : ''} />`)
    garis.push(
      `      <bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}">${titik.map(([x, y]) => `<di:waypoint x="${x}" y="${y}" />`).join('')}</bpmndi:BPMNEdge>`,
    )
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    const dari = nodes[i]
    const ke = nodes[i + 1]
    tambahAlur(`Alur_${kunci}_${i}`, dari, ke, [[dari.x + dari.w, GARIS_TENGAH], [ke.x, GARIS_TENGAH]], dari.tipe === 'gateway' ? 'Ya' : undefined)
    // Jalur "Tidak": kembali ke langkah sebelum gateway lewat bawah diagram.
    const sebelum = nodes[i - 1]
    if (dari.tipe === 'gateway' && sebelum?.tipe === 'task') {
      const pusatG = dari.x + dari.w / 2
      const pusatT = sebelum.x + sebelum.w / 2
      tambahAlur(
        `Alur_${kunci}_kembali_${i}`,
        dari,
        sebelum,
        [[pusatG, dari.y + dari.h], [pusatG, 200], [pusatT, 200], [pusatT, sebelum.y + sebelum.h]],
        'Tidak',
      )
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definisi_${kunci}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Proses_${kunci}" isExecutable="false">
${model.join('\n')}
${alur.join('\n')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_${kunci}">
    <bpmndi:BPMNPlane id="Bidang_${kunci}" bpmnElement="Proses_${kunci}">
${tata.join('\n')}
${garis.join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`
}
