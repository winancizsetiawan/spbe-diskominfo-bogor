export type JenisDasbor = 'instansi' | 'analitik'

/** Satu indikator: nilai instansi dibanding agregat seluruh kota, dalam persen. */
export interface IndikatorPerbandingan {
  kunci: 'kepatuhanRaa' | 'klasifikasi' | 'tervalidasi' | 'flowchart'
  label: string
  keterangan: string
  instansi: number
  kota: number
  /** Pembilang dan penyebut untuk nilai instansi, mis. 14 dari 24 aplikasi. */
  pembilang: number
  penyebut: number
}

export interface DasborInstansi {
  instansi: { id: number; nama: string }
  indikator: IndikatorPerbandingan[]
  /** Layanan dan data null bila belum ada sumbernya. */
  cakupan: { proses: number; aplikasi: number; layanan: number | null; data: number | null }
}

/** URL embed bertanda tangan dari API; berumur pendek dengan filter instansi terkunci di server. */
export interface EmbedDasbor {
  url: string
  /** Waktu URL tidak berlaku lagi, ISO. */
  kedaluwarsa: string
  /** Filter yang dikunci server, hanya untuk ditampilkan ke pengguna. */
  filterTerkunci: string | null
}
