import { Download, Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import { useEffect, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'

interface Props {
  xml: string
  /** Dipakai untuk label aksesibilitas dan nama berkas SVG. */
  nama: string
  namaBerkas: string
}

interface CanvasApi {
  zoom(level?: 'fit-viewport' | number): number
}

interface ElemenDiagram {
  type: string
  x: number
  businessObject: { name?: string }
}

interface RegistriApi {
  filter(fn: (e: ElemenDiagram) => boolean): ElemenDiagram[]
}

const TIPE_LANGKAH = ['bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:SubProcess']

function unduh(isi: string, tipe: string, nama: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }))
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Penampil diagram BPMN 2.0 dengan geser dan zoom. Chunk ini memuat bpmn-js sehingga
 * hanya diunduh saat halaman yang menampilkan diagram dibuka.
 */
export default function BpmnViewer({ xml, nama, namaBerkas }: Props) {
  const wadah = useRef<HTMLDivElement>(null)
  const viewer = useRef<NavigatedViewer | null>(null)
  const [status, setStatus] = useState<'memuat' | 'siap' | 'gagal'>('memuat')
  const [langkah, setLangkah] = useState<string[]>([])

  useEffect(() => {
    if (!wadah.current) return
    const v = new NavigatedViewer({ container: wadah.current })
    viewer.current = v
    let dibatalkan = false
    setStatus('memuat')

    v.importXML(xml)
      .then(() => {
        if (dibatalkan) return
        v.get<CanvasApi>('canvas').zoom('fit-viewport')
        // Alternatif teks untuk pembaca layar: nama langkah berurutan dari kiri ke kanan.
        setLangkah(
          v
            .get<RegistriApi>('elementRegistry')
            .filter((e) => TIPE_LANGKAH.includes(e.type) && !!e.businessObject.name)
            .sort((a, b) => a.x - b.x)
            .map((e) => e.businessObject.name!),
        )
        setStatus('siap')
      })
      .catch(() => {
        if (!dibatalkan) setStatus('gagal')
      })

    return () => {
      dibatalkan = true
      v.destroy()
      viewer.current = null
    }
  }, [xml])

  const zoom = (faktor: number) => {
    const canvas = viewer.current?.get<CanvasApi>('canvas')
    if (canvas) canvas.zoom(canvas.zoom() * faktor)
  }

  const unduhSvg = async () => {
    const hasil = await viewer.current?.saveSVG()
    if (hasil) unduh(hasil.svg, 'image/svg+xml', `${namaBerkas}.svg`)
  }

  const tombol = 'grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50'

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2" role="toolbar" aria-label="Kontrol diagram">
        <button type="button" className={tombol} onClick={() => zoom(1.2)} aria-label="Perbesar" disabled={status !== 'siap'}>
          <ZoomIn className="size-4" aria-hidden />
        </button>
        <button type="button" className={tombol} onClick={() => zoom(1 / 1.2)} aria-label="Perkecil" disabled={status !== 'siap'}>
          <ZoomOut className="size-4" aria-hidden />
        </button>
        <button type="button" className={tombol} onClick={() => viewer.current?.get<CanvasApi>('canvas').zoom('fit-viewport')} aria-label="Sesuaikan ke layar" disabled={status !== 'siap'}>
          <Maximize className="size-4" aria-hidden />
        </button>
        <button type="button" className={`${tombol} w-auto gap-1.5 px-3 text-xs font-medium`} onClick={() => void unduhSvg()} disabled={status !== 'siap'}>
          <Download className="size-4" aria-hidden /> Unduh SVG
        </button>
      </div>

      <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div ref={wadah} role="img" aria-label={`Diagram BPMN ${nama}`} className="size-full" />
        {status === 'memuat' && (
          <div className="absolute inset-0 grid place-items-center bg-white/80">
            <Spinner label="Memuat diagram…" />
          </div>
        )}
        {status === 'gagal' && (
          <p role="alert" className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-red-700">
            Diagram tidak dapat ditampilkan. Berkas BPMN mungkin rusak.
          </p>
        )}
      </div>

      {langkah.length > 0 && (
        <details className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">Langkah proses (versi teks)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
            {langkah.map((l, i) => (
              <li key={`${i}-${l}`}>{l}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
