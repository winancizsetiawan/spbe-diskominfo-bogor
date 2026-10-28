export interface ProfilRow {
  nip: string
  jabatan: string
  golongan: string
  satkerInduk: string
  noTelepon: string | null
  kanalEmail: boolean
}

// Data fiktif. Pada sistem sungguhan, field ini berasal dari klaim SSO dan hanya baca.
export const profil: Record<number, ProfilRow> = {
  1: { nip: '198601012015031001', jabatan: 'Pranata Komputer Ahli Muda', golongan: 'III/c (Penata)', satkerInduk: 'Bidang APTIKA, Diskominfo', noTelepon: '081234567890', kanalEmail: true },
  2: { nip: '197805142005012002', jabatan: 'Dosen, Mitra Literasi SPBE', golongan: 'IV/a (Pembina)', satkerInduk: 'Fakultas Teknologi Informasi', noTelepon: null, kanalEmail: false },
  3: { nip: '199002202014022003', jabatan: 'Administrator Sistem Informasi', golongan: 'III/b (Penata Muda Tk.I)', satkerInduk: 'Sekretariat Dinas Kesehatan', noTelepon: '085711223344', kanalEmail: true },
  4: { nip: '198204302008011004', jabatan: 'Walidata dan Pengelola SPBE', golongan: 'III/d (Penata Tk.I)', satkerInduk: 'Bidang APTIKA, Diskominfo', noTelepon: '081300998877', kanalEmail: true },
}
