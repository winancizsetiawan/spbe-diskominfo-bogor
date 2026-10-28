import { api } from '@/api/client'
import type { Dokumen } from '@/features/dokumen/types'
import type { MetadataDokumen, SesiUnggah } from './types'
import { tipeDariNama } from './types'

export type FaseUnggah = 'diam' | 'menyiapkan' | 'mengunggah' | 'menyimpan'

interface Opsi {
  onFase(fase: FaseUnggah): void
  /** 0–100 selama berkas dikirim ke Object Storage. */
  onProgres(persen: number): void
  signal: AbortSignal
}

const dibatalkan = () => new DOMException('Unggahan dibatalkan.', 'AbortError')

/**
 * Kirim berkas langsung ke Object Storage. XMLHttpRequest dipakai karena fetch
 * belum dapat melaporkan progres unggahan.
 */
function kirimBerkas(sesi: SesiUnggah, file: File, { onProgres, signal }: Opsi): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(dibatalkan())
    const form = new FormData()
    for (const [kunci, nilai] of Object.entries(sesi.fields)) form.append(kunci, nilai)
    form.append('file', file) // field berkas wajib terakhir pada kebijakan POST

    const xhr = new XMLHttpRequest()
    xhr.open('POST', sesi.urlUnggah)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgres(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Penyimpanan menolak berkas. Silakan coba lagi.'))
    xhr.onerror = () => reject(new Error('Koneksi ke penyimpanan terputus. Silakan coba lagi.'))
    xhr.onabort = () => reject(dibatalkan())
    signal.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(form)
  })
}

/**
 * Sequence Diagram 6: mulai → kirim ke Object Storage → selesai.
 * Server memilih nama objek acak; FE hanya mengirim nama asli untuk tampilan.
 */
export async function unggahDokumen(file: File, metadata: MetadataDokumen, opsi: Opsi): Promise<Dokumen> {
  const tipeBerkas = tipeDariNama(file.name)
  if (!tipeBerkas) throw new Error('Tipe berkas tidak diizinkan.')

  opsi.onFase('menyiapkan')
  const sesi = await api<SesiUnggah>('/dokumen/unggah/mulai', {
    method: 'POST',
    json: { nama: file.name, tipeBerkas, ukuranBytes: file.size, metadata },
    signal: opsi.signal,
  })

  opsi.onFase('mengunggah')
  opsi.onProgres(0)
  await kirimBerkas(sesi, file, opsi)

  opsi.onFase('menyimpan')
  return api<Dokumen>('/dokumen/unggah/selesai', { method: 'POST', json: { idSesi: sesi.idSesi }, signal: opsi.signal })
}
