/**
 * Dasbor Publik: tujuh domain Arsitektur SPBE Kota Bogor yang boleh dilihat umum.
 * Bentuknya mengikuti scripts/excel_dasbor_publik.py; batasan data publik dicatat di sana.
 */
export interface Jumlah {
  label: string
  nilai: number
}

export interface IkuPublik {
  unit: string
  sasaran: string
  indikator: string
  target: string
  realisasi: string
}

export interface ProsesBisnisPublik {
  id: string
  nama: string
  sasaran: string
  urusan: string
  jenis: string
  unit: string
}

export interface LayananPublik {
  id: string
  nama: string
  tujuan: string
  target: string
  metode: string
  area: string
  unit: string
  /** Hanya dasbor internal. */
  risiko?: string
  mitigasi?: string
}

export interface DataPublik {
  id: string
  nama: string
  /** Hanya dasbor internal (katalog publik selalu Terbuka). */
  sifat?: string
  jenis: string
  validitas: string
  produsen: string
  wali: string
  kelompok: string
}

export interface AplikasiPublik {
  id: string
  nama: string
  fungsi: string
  basis: string
  kepemilikan: string
  jenis: string
  unit: string
  /** Rincian teknis: hanya dasbor internal. */
  url?: string
  lisensi?: string
  database?: string
  bahasa?: string
  sistemOperasi?: string
  lokasiServer?: string
  pengembang?: string
}

/** Bagian di bawah ini hanya ada di dasbor internal. */
export interface ElemenInfrastruktur {
  id: string
  nama: string
  kategori: string
}

export interface PusatData {
  nama: string
  lokasi: string
  bandwidthIntranet: string
  bandwidthInternet: string
  tier: string
  pengamanan: string
  kepemilikan: string
}

export interface Server {
  id: string
  nama: string
  uraian: string
  lokasi: string
  penggunaan: string
  pemilik: string
  memori: string
  prosesor: string
  sistemOperasi: string
}

export interface KegiatanKeamanan {
  kategori: string
  id: string
  nama: string
  uraian: string
  tanggal: string
  hasilAudit: string
  jenisAudit: string
  tindakLanjut: string
}

export interface KegiatanRencana {
  aktivitas: string
  sasaran: string
  muatan: string
  indikator: string
  uic: string
  tahun: string
  status: string
  nominal: string
}

/** Rekap arsitektur per OPD (sheet UnitKerja), urut dari yang terbanyak. */
export interface ArsitekturOpd {
  opd: string
  akronim: string
  prosesBisnis: number
  layanan: number
  data: number
  aplikasi: number
}

export interface DasborPublik {
  sumber: { judul: string; diolah: string }
  perOpd: ArsitekturOpd[]
  prosesBisnis: {
    jumlahUnit: number
    jumlahProsesBisnis: number
    perSektor: Jumlah[]
    perUrusan: Jumlah[]
    perJenis: Jumlah[]
    iku: IkuPublik[]
    katalog: ProsesBisnisPublik[]
  }
  layanan: {
    jumlahLayanan: number
    jumlahUnit: number
    perTarget: Jumlah[]
    perMetode: Jumlah[]
    perArea: Jumlah[]
    katalog: LayananPublik[]
  }
  data: {
    jumlahData: number
    jumlahJenis: number
    perSifat: Jumlah[]
    perJenis: Jumlah[]
    perValiditas: Jumlah[]
    perKelompok: Jumlah[]
    /** Data bersifat Terbatas/Tertutup: dihitung, tidak dirinci. */
    tidakDitampilkan: number
    katalog: DataPublik[]
  }
  aplikasi: {
    jumlahAplikasi: number
    jumlahUnit: number
    perKepemilikan: Jumlah[]
    perJenis: Jumlah[]
    perFungsi: Jumlah[]
    perBasis: Jumlah[]
    opdTeratas: Jumlah[]
    katalog: AplikasiPublik[]
  }
  /** Hanya angka: nama dan spesifikasi perangkat tidak dibuka ke umum. */
  infrastruktur: {
    perKategori: Jumlah[]
    jumlahPusatData: number
    pusatDataPerKepemilikan: Jumlah[]
    pusatDataPerTier: Jumlah[]
    jumlahJaringanIntra: number
    katalog?: ElemenInfrastruktur[]
    pusatData?: PusatData[]
    server?: Server[]
  }
  /** Hanya angka yang aman dibuka: tanpa kerentanan, insiden, hasil audit, dan perangkat keamanan. */
  keamanan: {
    jumlahStandar: number
    standarPerJenis: Jumlah[]
    edukasiPerTahun: Jumlah[]
    perSubdomain?: Jumlah[]
    perHasilAudit?: Jumlah[]
    perTindakLanjut?: Jumlah[]
    katalog?: KegiatanKeamanan[]
  }
  petaRencana: {
    totalKegiatan: number
    sudahDilakukan: number
    perStatus: Jumlah[]
    perMuatan: Jumlah[]
    perTahun: Jumlah[]
    /** Untuk grafik kurva per tahun. */
    trenTahunan: { tahun: string; direncanakan: number; terlaksana: number }[]
    opdTeratas: Jumlah[]
    sasaranTeratas: Jumlah[]
    katalog?: KegiatanRencana[]
  }
}

export type Domain = 'proses-bisnis' | 'layanan' | 'data' | 'aplikasi' | 'infrastruktur' | 'keamanan' | 'peta-rencana'

export const DOMAIN: { key: Domain; label: string }[] = [
  { key: 'proses-bisnis', label: 'Proses Bisnis' },
  { key: 'layanan', label: 'Layanan' },
  { key: 'data', label: 'Data' },
  { key: 'aplikasi', label: 'Aplikasi' },
  { key: 'infrastruktur', label: 'Infrastruktur' },
  { key: 'keamanan', label: 'Keamanan' },
  { key: 'peta-rencana', label: 'Peta Rencana' },
]
