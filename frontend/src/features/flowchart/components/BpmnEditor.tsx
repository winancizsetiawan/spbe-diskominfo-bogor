import { Download, FileUp } from 'lucide-react'
import Modeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { BATAS_FLOWCHART, type HasilXml } from '../types'

export interface BpmnEditorHandle {
  /** Serialisasi diagram saat ini beserta pemeriksaan peristiwa awal dan akhir. */
  ambilXml(): Promise<HasilXml>
}

interface Props {
  /** Dimuat sekali saat editor dibuat; perubahan prop ini tidak menimpa suntingan. */
  xmlAwal: string
  ref?: Ref<BpmnEditorHandle>
  disabled?: boolean
  namaBerkas: string
}

interface RegistriApi {
  filter(fn: (e: { type: string }) => boolean): unknown[]
}

const tombol =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'

/** Editor BPMN 2.0 (palet, konteks, dan seret-lepas bawaan bpmn-js). Chunk ini memuat modeler lengkap. */
export default function BpmnEditor({ xmlAwal, ref, disabled = false, namaBerkas }: Props) {
  const wadah = useRef<HTMLDivElement>(null)
  const modeler = useRef<Modeler | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'memuat' | 'siap' | 'gagal'>('memuat')
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    if (!wadah.current) return
    const m = new Modeler({ container: wadah.current })
    modeler.current = m
    let dibatalkan = false
    m.importXML(xmlAwal)
      .then(() => !dibatalkan && setStatus('siap'))
      .catch(() => !dibatalkan && setStatus('gagal'))
    return () => {
      dibatalkan = true
      m.destroy()
      modeler.current = null
    }
    // xmlAwal sengaja tidak menjadi dependensi: diagram hanya dimuat sekali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    async ambilXml() {
      const m = modeler.current
      if (!m) throw new Error('Editor belum siap.')
      const { xml } = await m.saveXML({ format: true })
      const registri = m.get<RegistriApi>('elementRegistry')
      return {
        xml: xml ?? '',
        adaMulai: registri.filter((e) => e.type === 'bpmn:StartEvent').length > 0,
        adaAkhir: registri.filter((e) => e.type === 'bpmn:EndEvent').length > 0,
      }
    },
  }))

  const impor = async (file: File | undefined) => {
    if (!file || !modeler.current) return
    setPesan(null)
    if (file.size > BATAS_FLOWCHART.maksBytes) return setPesan(`Ukuran berkas melebihi ${BATAS_FLOWCHART.maksBytes / 1024 / 1024} MB.`)
    try {
      await modeler.current.importXML(await file.text())
      setStatus('siap')
      setPesan(`Berkas ${file.name} dimuat. Periksa diagram sebelum menyimpan.`)
    } catch {
      // Diagram sebelumnya tetap dipakai bila berkas baru tidak dapat dibaca.
      setPesan('Berkas bukan BPMN 2.0 yang valid.')
    }
    if (input.current) input.current.value = ''
  }

  const unduhXml = async () => {
    if (!modeler.current) return
    const { xml } = await modeler.current.saveXML({ format: true })
    const url = URL.createObjectURL(new Blob([xml ?? ''], { type: 'application/xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${namaBerkas}.bpmn`
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={tombol} onClick={() => input.current?.click()} disabled={disabled || status === 'memuat'}>
          <FileUp className="size-4" aria-hidden /> Impor berkas BPMN
        </button>
        <button type="button" className={tombol} onClick={() => void unduhXml()} disabled={status !== 'siap'}>
          <Download className="size-4" aria-hidden /> Unduh XML
        </button>
        <input
          ref={input}
          type="file"
          accept=".bpmn,.xml"
          className="sr-only"
          aria-label="Pilih berkas BPMN"
          tabIndex={-1}
          onChange={(e) => void impor(e.target.files?.[0])}
        />
        <p className="ml-auto text-xs text-slate-500">Seret elemen dari palet di kiri. Maksimal {BATAS_FLOWCHART.maksBytes / 1024 / 1024} MB.</p>
      </div>
      {pesan && (
        <p role="status" className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {pesan}
        </p>
      )}
      <div className="relative h-[520px] overflow-hidden rounded-xl border border-slate-300 bg-white">
        <div ref={wadah} className={`size-full ${disabled ? 'pointer-events-none opacity-60' : ''}`} />
        {status === 'gagal' && (
          <p role="alert" className="absolute inset-0 grid place-items-center bg-white px-6 text-center text-sm text-red-700">
            Diagram awal tidak dapat dibaca. Impor berkas BPMN yang valid untuk melanjutkan.
          </p>
        )}
      </div>
    </div>
  )
}
